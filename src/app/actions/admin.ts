"use server";

import { createHash } from "node:crypto";
import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Papa from "papaparse";
import readXlsxFile from "read-excel-file/node";
import sharp from "sharp";
import { z } from "zod";
import { getDb } from "@/db";
import {
  auditLogs,
  certificates,
  certificateTemplates,
  events,
  importBatches,
  registrations,
} from "@/db/schema";
import { requireOrganization } from "@/lib/auth";
import { normalizeEmail } from "@/lib/security";
import {
  createRecord,
  findRecords,
  writeBatch as writeFirestoreBatch,
} from "@/lib/firestore-data";

const eventNameSchema = z.string().trim().min(3).max(140);

const templateConfigSchema = z.object({
  nameY: z.coerce.number().min(20).max(75),
  nameFontSize: z.coerce.number().min(16).max(60),
  codeX: z.coerce.number().min(2).max(90),
  codeY: z.coerce.number().min(70).max(97),
  codeFontSize: z.coerce.number().min(7).max(18),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

const emailSchema = z.email().max(254);

function participantTicketCode(eventId: string, email: string) {
  return `EMAIL-${createHash("sha256")
    .update(`${eventId}:${email}`)
    .digest("hex")
    .slice(0, 20)
    .toUpperCase()}`;
}

export async function deleteEvent(formData: FormData) {
  const eventId = z.uuid().parse(formData.get("eventId"));
  const { session, organization } = await requireOrganization();
  const db = getDb();
  const [[event], [{ issuedCertificates }]] = await Promise.all([
    db
      .select({ id: events.id, name: events.name, status: events.status })
      .from(events)
      .where(
        and(eq(events.id, eventId), eq(events.organizationId, organization.id)),
      )
      .limit(1),
    db
      .select({ issuedCertificates: count(certificates.id) })
      .from(certificates)
      .innerJoin(
        registrations,
        eq(registrations.id, certificates.registrationId),
      )
      .where(eq(registrations.eventId, eventId)),
  ]);

  if (!event) throw new Error("Evento não encontrado");

  await db.transaction(async (tx) => {
    await tx.insert(auditLogs).values({
      organizationId: organization.id,
      actorId: session.userId!,
      entityType: "event",
      entityId: event.id,
      action: "event.deleted",
      before: {
        name: event.name,
        status: event.status,
        issuedCertificates,
      },
    });
    await tx
      .delete(certificates)
      .where(
        inArray(
          certificates.registrationId,
          tx
            .select({ id: registrations.id })
            .from(registrations)
            .where(eq(registrations.eventId, event.id)),
        ),
      );
    await tx
      .delete(events)
      .where(
        and(
          eq(events.id, event.id),
          eq(events.organizationId, organization.id),
        ),
      );
  });

  revalidatePath("/dashboard/eventos");
  revalidatePath("/dashboard");
  redirect("/dashboard/eventos?excluido=1");
}

export async function updateEventName(formData: FormData) {
  const eventId = z.uuid().parse(formData.get("eventId"));
  const parsedName = eventNameSchema.safeParse(formData.get("name"));
  if (!parsedName.success) {
    redirect(`/dashboard/eventos/${eventId}?erro=nome-invalido`);
  }

  const { session, organization } = await requireOrganization();
  const db = getDb();
  const [event] = await db
    .select({ id: events.id, name: events.name })
    .from(events)
    .where(
      and(eq(events.id, eventId), eq(events.organizationId, organization.id)),
    )
    .limit(1);

  if (!event) throw new Error("Evento não encontrado");
  if (event.name !== parsedName.data) {
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx
        .update(events)
        .set({ name: parsedName.data, updatedAt: now })
        .where(
          and(
            eq(events.id, eventId),
            eq(events.organizationId, organization.id),
          ),
        );
      await tx.insert(auditLogs).values({
        organizationId: organization.id,
        actorId: session.userId!,
        entityType: "event",
        entityId: eventId,
        action: "event.name.updated",
        before: { name: event.name },
        after: { name: parsedName.data },
      });
    });
  }

  revalidatePath(`/dashboard/eventos/${eventId}`);
  revalidatePath("/dashboard/eventos");
  revalidatePath("/dashboard");
  redirect(`/dashboard/eventos/${eventId}?nome=salvo`);
}

export async function addParticipant(formData: FormData) {
  const eventId = z.uuid().parse(formData.get("eventId"));
  const { session, organization } = await requireOrganization();
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!emailSchema.safeParse(email).success) {
    redirect(`/dashboard/eventos/${eventId}?erro=email-invalido`);
  }

  const db = getDb();
  const [event] = await db
    .select({ id: events.id })
    .from(events)
    .where(
      and(eq(events.id, eventId), eq(events.organizationId, organization.id)),
    )
    .limit(1);
  if (!event) throw new Error("Evento não encontrado");

  const ticketCode = participantTicketCode(eventId, email);
  const [registration] = await db
    .insert(registrations)
    .values({
      eventId,
      buyerEmail: email,
      participantEmail: email,
      ticketCode,
      eligibility: "eligible",
    })
    .onConflictDoUpdate({
      target: [registrations.eventId, registrations.ticketCode],
      set: {
        buyerEmail: email,
        participantEmail: email,
        eligibility: sql`case when ${registrations.eligibility} in ('issued', 'revoked') then ${registrations.eligibility} else 'eligible'::eligibility_status end`,
        updatedAt: new Date(),
      },
    })
    .returning({ id: registrations.id });

  await db.insert(auditLogs).values({
    organizationId: organization.id,
    actorId: session.userId!,
    entityType: "registration",
    entityId: registration.id,
    action: "participant.added_manually",
    after: { emailHash: createHash("sha256").update(email).digest("hex") },
  });

  revalidatePath(`/dashboard/eventos/${eventId}`);
  redirect(`/dashboard/eventos/${eventId}?adicionado=1`);
}

export async function publishEvent(formData: FormData) {
  const eventId = z.uuid().parse(formData.get("eventId"));
  const { session, organization } = await requireOrganization();
  const db = getDb();
  const [event] = await db
    .select()
    .from(events)
    .where(
      and(eq(events.id, eventId), eq(events.organizationId, organization.id)),
    )
    .limit(1);
  if (!event) throw new Error("Evento não encontrado");

  const [[{ eligible }], [template]] = await Promise.all([
    db
      .select({ eligible: count() })
      .from(registrations)
      .where(
        and(
          eq(registrations.eventId, eventId),
          eq(registrations.eligibility, "eligible"),
        ),
      ),
    db
      .select()
      .from(certificateTemplates)
      .where(eq(certificateTemplates.eventId, eventId))
      .limit(1),
  ]);
  if (eligible === 0 || !template?.backgroundData || !event.supportChannel) {
    redirect(`/dashboard/eventos/${eventId}?erro=publicacao-incompleta`);
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(events)
      .set({ status: "published", publishedAt: now, updatedAt: now })
      .where(eq(events.id, eventId));
    await tx
      .update(certificateTemplates)
      .set({ isPublished: true })
      .where(eq(certificateTemplates.id, template.id));
    await tx.insert(auditLogs).values({
      organizationId: organization.id,
      actorId: session.userId!,
      entityType: "event",
      entityId: eventId,
      action: "event.published",
      before: { status: event.status },
      after: { status: "published" },
    });
  });
  revalidatePath(`/dashboard/eventos/${eventId}`);
  revalidatePath("/dashboard");
}

export async function uploadCertificateTemplate(formData: FormData) {
  const eventId = z.uuid().parse(formData.get("eventId"));
  const file = formData.get("file");
  const parsedConfig = templateConfigSchema.safeParse(
    Object.fromEntries(formData),
  );

  if (!parsedConfig.success) {
    redirect(`/dashboard/eventos/${eventId}?erro=template-invalido`);
  }

  const { session, organization } = await requireOrganization();
  const db = getDb();
  const [[event], [template]] = await Promise.all([
    db
      .select({ id: events.id })
      .from(events)
      .where(
        and(eq(events.id, eventId), eq(events.organizationId, organization.id)),
      )
      .limit(1),
    db
      .select()
      .from(certificateTemplates)
      .where(eq(certificateTemplates.eventId, eventId))
      .orderBy(desc(certificateTemplates.version))
      .limit(1),
  ]);
  if (!event || !template) throw new Error("Evento ou template não encontrado");

  const hasNewFile = file instanceof File && file.size > 0;
  if (!hasNewFile && !template.backgroundData) {
    redirect(`/dashboard/eventos/${eventId}?erro=template-invalido`);
  }

  let backgroundData = template.backgroundData;
  let backgroundMime = template.backgroundMime;
  let backgroundFilename = template.backgroundFilename;

  if (hasNewFile) {
    if (
      file.size > 10 * 1024 * 1024 ||
      !["image/png", "image/jpeg"].includes(file.type)
    ) {
      redirect(`/dashboard/eventos/${eventId}?erro=template-invalido`);
    }

    try {
      backgroundData = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize({
          width: 2400,
          height: 1800,
          fit: "inside",
          withoutEnlargement: true,
        })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true })
        .toBuffer();
      backgroundMime = "image/jpeg";
      backgroundFilename = file.name;
    } catch {
      redirect(`/dashboard/eventos/${eventId}?erro=template-invalido`);
    }
  }

  const config = {
    ...template.config,
    orientation: "landscape" as const,
    name: {
      y: parsedConfig.data.nameY,
      fontSize: parsedConfig.data.nameFontSize,
      color: parsedConfig.data.textColor,
    },
    code: {
      x: parsedConfig.data.codeX,
      y: parsedConfig.data.codeY,
      fontSize: parsedConfig.data.codeFontSize,
      color: parsedConfig.data.textColor,
    },
  };

  await db.transaction(async (tx) => {
    await tx
      .update(certificateTemplates)
      .set({ backgroundData, backgroundMime, backgroundFilename, config })
      .where(eq(certificateTemplates.id, template.id));
    await tx.insert(auditLogs).values({
      organizationId: organization.id,
      actorId: session.userId!,
      entityType: "certificate_template",
      entityId: template.id,
      action: "template.background.updated",
      before: { filename: template.backgroundFilename },
      after: { filename: backgroundFilename, config },
    });
  });

  revalidatePath(`/dashboard/eventos/${eventId}`);
  redirect(`/dashboard/eventos/${eventId}?aba=template&template=salvo`);
}

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function pick(row: Record<string, unknown>, names: string[]) {
  for (const name of names) {
    const value = row[name];
    if (value !== undefined && String(value).trim())
      return String(value).trim();
  }
  return "";
}

export async function importParticipants(formData: FormData) {
  const eventId = z.uuid().parse(formData.get("eventId"));
  const file = formData.get("file");
  if (
    !(file instanceof File) ||
    file.size === 0 ||
    file.size > 10 * 1024 * 1024
  ) {
    redirect(`/dashboard/eventos/${eventId}?erro=arquivo-invalido`);
  }

  const { session, organization } = await requireOrganization();
  const [event] = await findRecords<{ id: string; organizationId: string }>(
    "events",
    { id: eventId, organizationId: organization.id },
  );
  if (!event) throw new Error("Evento não encontrado");

  let rows: Record<string, unknown>[] = [];
  const buffer = Buffer.from(await file.arrayBuffer());
  if (file.name.toLowerCase().endsWith(".xlsx")) {
    const [sheet] = await readXlsxFile(buffer);
    const [rawHeaders, ...data] = sheet.data;
    const headers = rawHeaders.map(normalizeHeader);
    rows = data.map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index]]),
      ),
    );
  } else {
    const result = Papa.parse<Record<string, string>>(buffer.toString("utf8"), {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: normalizeHeader,
    });
    rows = result.data;
  }

  const seen = new Set<string>();
  let invalidRows = 0;
  let duplicateRows = 0;
  const valid = [] as (typeof registrations.$inferInsert)[];
  for (const row of rows) {
    const email = normalizeEmail(
      pick(row, [
        "email",
        "e_mail",
        "email_participante",
        "email_compra",
        "email_address",
        "emails",
      ]),
    );
    if (!emailSchema.safeParse(email).success) {
      invalidRows += 1;
      continue;
    }
    if (seen.has(email)) {
      duplicateRows += 1;
      continue;
    }
    seen.add(email);
    const ticketCode = participantTicketCode(eventId, email);
    valid.push({
      eventId,
      buyerEmail: email,
      participantEmail: email,
      ticketCode,
      eligibility: "eligible",
    });
  }

  const batchId = crypto.randomUUID();
  const now = new Date();
  const existing = await findRecords<{
    id: string;
    ticketCode: string;
    eligibility: string;
  }>("registrations", { eventId });
  const existingByTicket = new Map(existing.map((item) => [item.ticketCode, item]));
  await writeFirestoreBatch([
    {
      collection: "import_batches",
      id: batchId,
      data: {
        eventId,
        filename: file.name,
        totalRows: rows.length,
        validRows: valid.length,
        invalidRows,
        duplicateRows,
        createdBy: session.userId!,
        createdAt: now,
      },
    },
    ...valid.map((value) => {
      const previous = existingByTicket.get(value.ticketCode);
      return {
        collection: "registrations",
        id: previous?.id ?? crypto.randomUUID(),
        data: {
          ...value,
          importBatchId: batchId,
          eligibility:
            previous?.eligibility === "issued" || previous?.eligibility === "revoked"
              ? previous.eligibility
              : "eligible",
          createdAt: previous ? undefined : now,
          updatedAt: now,
        },
      };
    }),
  ]);

  await createRecord("audit_logs", {
    organizationId: organization.id,
    actorId: session.userId!,
    entityType: "import_batch",
    entityId: batchId,
    action: "participants.imported",
    after: {
      filenameHash: createHash("sha256").update(file.name).digest("hex"),
      totalRows: rows.length,
      validRows: valid.length,
      invalidRows,
      duplicateRows,
    },
    createdAt: now,
  });
  redirect(
    `/dashboard/eventos/${eventId}?importados=${valid.length}&invalidos=${invalidRows}`,
  );
}

export async function setEligibility(formData: FormData) {
  const registrationId = z.uuid().parse(formData.get("registrationId"));
  const eventId = z.uuid().parse(formData.get("eventId"));
  const eligibility = z
    .enum(["pending", "eligible", "ineligible", "blocked"])
    .parse(formData.get("eligibility"));
  const { session, organization } = await requireOrganization();
  const db = getDb();
  const [registration] = await db
    .select({ id: registrations.id, previous: registrations.eligibility })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(
      and(
        eq(registrations.id, registrationId),
        eq(registrations.eventId, eventId),
        eq(events.organizationId, organization.id),
      ),
    )
    .limit(1);
  if (!registration) throw new Error("Inscrição não encontrada");
  await db.transaction(async (tx) => {
    await tx
      .update(registrations)
      .set({ eligibility, updatedAt: new Date() })
      .where(eq(registrations.id, registrationId));
    await tx.insert(auditLogs).values({
      organizationId: organization.id,
      actorId: session.userId!,
      entityType: "registration",
      entityId: registrationId,
      action: "eligibility.updated",
      before: { eligibility: registration.previous },
      after: { eligibility },
    });
  });
  revalidatePath(`/dashboard/eventos/${eventId}`);
}

export async function revokeCertificate(formData: FormData) {
  const certificateId = z.uuid().parse(formData.get("certificateId"));
  const eventId = z.uuid().parse(formData.get("eventId"));
  const reason = z
    .string()
    .trim()
    .min(3)
    .max(300)
    .parse(formData.get("reason"));
  const { session, organization } = await requireOrganization();
  const db = getDb();
  const [certificate] = await db
    .select({
      id: certificates.id,
      registrationId: certificates.registrationId,
    })
    .from(certificates)
    .innerJoin(registrations, eq(registrations.id, certificates.registrationId))
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(
      and(
        eq(certificates.id, certificateId),
        eq(events.organizationId, organization.id),
      ),
    )
    .limit(1);
  if (!certificate) throw new Error("Certificado não encontrado");
  await db.transaction(async (tx) => {
    await tx
      .update(certificates)
      .set({
        status: "revoked",
        revokedAt: new Date(),
        revocationReason: reason,
      })
      .where(eq(certificates.id, certificateId));
    await tx
      .update(registrations)
      .set({ eligibility: "revoked", updatedAt: new Date() })
      .where(eq(registrations.id, certificate.registrationId));
    await tx.insert(auditLogs).values({
      organizationId: organization.id,
      actorId: session.userId!,
      entityType: "certificate",
      entityId: certificateId,
      action: "certificate.revoked",
      after: { reason },
    });
  });
  revalidatePath(`/dashboard/eventos/${eventId}`);
}
