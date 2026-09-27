"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Papa from "papaparse";
import readXlsxFile from "read-excel-file/node";
import { z } from "zod";
import { registrations } from "@/db/schema";
import { requireOrganization } from "@/lib/auth";
import { normalizeEmail } from "@/lib/security";
import {
  createRecord,
  findRecords,
  getRecord,
  listRecords,
  writeBatch as writeFirestoreBatch,
} from "@/lib/firestore-data";

const eventNameSchema = z.string().trim().min(3).max(140);

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
  const event = await getRecord<{ id: string; name: string; status: string; organizationId: string }>("events", eventId);
  if (!event || event.organizationId !== organization.id) throw new Error("Evento não encontrado");
  const [eventRegistrations, templates, batches, allCertificates] = await Promise.all([
    findRecords<{ id: string }>("registrations", { eventId }),
    findRecords<{ id: string }>("certificate_templates", { eventId }),
    findRecords<{ id: string }>("import_batches", { eventId }),
    listRecords<{ id: string; registrationId: string }>("certificates"),
  ]);
  const registrationIds = new Set(eventRegistrations.map((item) => item.id));
  const relatedCertificates = allCertificates.filter((item) => registrationIds.has(item.registrationId));
  await writeFirestoreBatch([
    ...eventRegistrations.map((item) => ({ collection: "registrations", id: item.id, delete: true })),
    ...templates.map((item) => ({ collection: "certificate_templates", id: item.id, delete: true })),
    ...batches.map((item) => ({ collection: "import_batches", id: item.id, delete: true })),
    ...relatedCertificates.map((item) => ({ collection: "certificates", id: item.id, delete: true })),
    { collection: "events", id: eventId, delete: true },
    { collection: "audit_logs", id: crypto.randomUUID(), data: { organizationId: organization.id, actorId: session.userId!, entityType: "event", entityId: eventId, action: "event.deleted", before: { name: event.name, status: event.status, issuedCertificates: relatedCertificates.length }, createdAt: new Date() } },
  ]);

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
  const event = await getRecord<{ id: string; name: string; organizationId: string }>("events", eventId);
  if (!event || event.organizationId !== organization.id) throw new Error("Evento não encontrado");
  if (event.name !== parsedName.data) {
    const now = new Date();
    await writeFirestoreBatch([
      { collection: "events", id: eventId, data: { name: parsedName.data, updatedAt: now } },
      { collection: "audit_logs", id: crypto.randomUUID(), data: { organizationId: organization.id, actorId: session.userId!, entityType: "event", entityId: eventId, action: "event.name.updated", before: { name: event.name }, after: { name: parsedName.data }, createdAt: now } },
    ]);
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

  const event = await getRecord<{ id: string; organizationId: string }>("events", eventId);
  if (!event || event.organizationId !== organization.id) throw new Error("Evento não encontrado");

  const ticketCode = participantTicketCode(eventId, email);
  const [previous] = await findRecords<{ id: string; eligibility: string }>("registrations", { eventId, ticketCode });
  const registrationId = previous?.id ?? crypto.randomUUID();
  const now = new Date();
  await writeFirestoreBatch([{ collection: "registrations", id: registrationId, data: {
    id: registrationId, eventId, buyerEmail: email, participantEmail: email, ticketCode,
    eligibility: previous?.eligibility === "issued" || previous?.eligibility === "revoked" ? previous.eligibility : "eligible",
    createdAt: previous ? undefined : now, updatedAt: now,
  } }]);
  await createRecord("audit_logs", {
    organizationId: organization.id,
    actorId: session.userId!,
    entityType: "registration",
    entityId: registrationId,
    action: "participant.added_manually",
    after: { emailHash: createHash("sha256").update(email).digest("hex") },
    createdAt: now,
  });

  revalidatePath(`/dashboard/eventos/${eventId}`);
  redirect(`/dashboard/eventos/${eventId}?adicionado=1`);
}

export async function publishEvent(formData: FormData) {
  const eventId = z.uuid().parse(formData.get("eventId"));
  const { session, organization } = await requireOrganization();
  const event = await getRecord<{ id: string; organizationId: string; supportChannel?: string; status: string }>("events", eventId);
  if (!event || event.organizationId !== organization.id) throw new Error("Evento não encontrado");
  const [registrationRows, templates] = await Promise.all([
    findRecords<{ id: string; eligibility: string }>("registrations", { eventId }),
    findRecords<{ id: string; version: number; backgroundData?: Buffer; backgroundStoragePath?: string }>("certificate_templates", { eventId }),
  ]);
  const eligible = registrationRows.filter((item) => item.eligibility === "eligible").length;
  const template = templates.sort((a, b) => b.version - a.version)[0];
  if (
    eligible === 0 ||
    (!template?.backgroundData && !template?.backgroundStoragePath) ||
    !event.supportChannel
  ) {
    redirect(`/dashboard/eventos/${eventId}?erro=publicacao-incompleta`);
  }

  const now = new Date();
  await writeFirestoreBatch([
    { collection: "events", id: eventId, data: { status: "published", publishedAt: now, updatedAt: now } },
    { collection: "certificate_templates", id: template.id, data: { isPublished: true } },
    { collection: "audit_logs", id: crypto.randomUUID(), data: { organizationId: organization.id, actorId: session.userId!, entityType: "event", entityId: eventId, action: "event.published", before: { status: event.status }, after: { status: "published" }, createdAt: now } },
  ]);
  revalidatePath(`/dashboard/eventos/${eventId}`);
  revalidatePath("/dashboard");
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
  const [registration, event] = await Promise.all([
    getRecord<{ id: string; eventId: string; eligibility: string }>("registrations", registrationId),
    getRecord<{ id: string; organizationId: string }>("events", eventId),
  ]);
  if (!registration || registration.eventId !== eventId || !event || event.organizationId !== organization.id) throw new Error("Inscrição não encontrada");
  await writeFirestoreBatch([
    { collection: "registrations", id: registrationId, data: { eligibility, updatedAt: new Date() } },
    { collection: "audit_logs", id: crypto.randomUUID(), data: { organizationId: organization.id, actorId: session.userId!, entityType: "registration", entityId: registrationId, action: "eligibility.updated", before: { eligibility: registration.eligibility }, after: { eligibility }, createdAt: new Date() } },
  ]);
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
  const certificate = await getRecord<{ id: string; registrationId: string }>("certificates", certificateId);
  const registration = certificate ? await getRecord<{ id: string; eventId: string }>("registrations", certificate.registrationId) : null;
  const event = registration ? await getRecord<{ id: string; organizationId: string }>("events", registration.eventId) : null;
  if (!certificate || !registration || registration.eventId !== eventId || !event || event.organizationId !== organization.id) throw new Error("Certificado não encontrado");
  const now = new Date();
  await writeFirestoreBatch([
    { collection: "certificates", id: certificateId, data: { status: "revoked", revokedAt: now, revocationReason: reason } },
    { collection: "registrations", id: certificate.registrationId, data: { eligibility: "revoked", updatedAt: now } },
    { collection: "audit_logs", id: crypto.randomUUID(), data: { organizationId: organization.id, actorId: session.userId!, entityType: "certificate", entityId: certificateId, action: "certificate.revoked", after: { reason }, createdAt: now } },
  ]);
  revalidatePath(`/dashboard/eventos/${eventId}`);
}
