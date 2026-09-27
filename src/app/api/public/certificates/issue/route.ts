import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import {
  accessSessions,
  auditLogs,
  certificates,
  certificateTemplates,
  events,
  organizations,
  registrations,
} from "@/db/schema";
import { generateCertificatePdf } from "@/lib/pdf";
import { downloadPrivateFile } from "@/lib/firebase-storage";
import { createCertificateCode, hashValue, requestContextHash } from "@/lib/security";

const inputSchema = z.object({
  registrationId: z.uuid(),
  displayName: z
    .string()
    .trim()
    .min(3)
    .max(120)
    .regex(/^[\p{L}\p{M}][\p{L}\p{M}' .-]+$/u, "Nome inválido"),
});

export async function POST(request: NextRequest) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Confira o nome informado." }, { status: 400 });
  }

  const token = request.cookies.get("certifica_access")?.value;
  if (!token) return Response.json({ error: "Acesso expirado." }, { status: 401 });

  const db = getDb();
  const [access] = await db
    .select({
      sessionId: accessSessions.id,
      registrationId: registrations.id,
      eventId: events.id,
      eventName: events.name,
      eventEdition: events.edition,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      workloadHours: events.workloadHours,
      individualWorkloadHours: registrations.individualWorkloadHours,
      issuerName: events.issuerName,
      signatoryName: events.signatoryName,
      signatoryRole: events.signatoryRole,
      organizationId: organizations.id,
      templateId: certificateTemplates.id,
      templateBackground: certificateTemplates.backgroundData,
      templateStoragePath: certificateTemplates.backgroundStoragePath,
      templateMime: certificateTemplates.backgroundMime,
      templateConfig: certificateTemplates.config,
    })
    .from(accessSessions)
    .innerJoin(registrations, eq(registrations.id, accessSessions.registrationId))
    .innerJoin(events, eq(events.id, registrations.eventId))
    .innerJoin(organizations, eq(organizations.id, events.organizationId))
    .innerJoin(
      certificateTemplates,
      and(eq(certificateTemplates.eventId, events.id), eq(certificateTemplates.isPublished, true)),
    )
    .where(
      and(
        eq(accessSessions.tokenHash, hashValue(token)),
        eq(accessSessions.registrationId, parsed.data.registrationId),
        gt(accessSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!access) return Response.json({ error: "Acesso inválido ou expirado." }, { status: 401 });

  const [existing] = await db
    .select({ publicCode: certificates.publicCode })
    .from(certificates)
    .where(and(eq(certificates.registrationId, access.registrationId), eq(certificates.status, "valid")))
    .limit(1);
  if (existing) {
    return Response.json({
      code: existing.publicCode,
      downloadUrl: `/api/public/certificates/${existing.publicCode}/download`,
      validationUrl: `/validar/${existing.publicCode}`,
    });
  }

  const publicCode = createCertificateCode();
  const issuedAt = new Date();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const validationUrl = `${baseUrl}/validar/${publicCode}`;
  const templateBackground = access.templateStoragePath
    ? await downloadPrivateFile(access.templateStoragePath)
    : access.templateBackground;
  const pdf = await generateCertificatePdf({
    participantName: parsed.data.displayName,
    eventName: access.eventName,
    eventEdition: access.eventEdition,
    issuerName: access.issuerName,
    workloadHours: access.individualWorkloadHours ?? access.workloadHours,
    startsAt: access.startsAt,
    endsAt: access.endsAt,
    issuedAt,
    publicCode,
    validationUrl,
    signatoryName: access.signatoryName,
    signatoryRole: access.signatoryRole,
    templateBackground,
    templateMime: access.templateMime,
    templateConfig: access.templateConfig,
  });
  const documentHash = createHash("sha256").update(pdf).digest("hex");

  await db.transaction(async (tx) => {
    const [certificate] = await tx
      .insert(certificates)
      .values({
        registrationId: access.registrationId,
        templateId: access.templateId,
        publicCode,
        displayedName: parsed.data.displayName,
        issuedAt,
        pdfData: Buffer.alloc(0),
        documentHash,
      })
      .returning({ id: certificates.id });
    await tx
      .update(registrations)
      .set({ confirmedName: parsed.data.displayName, eligibility: "issued", updatedAt: issuedAt })
      .where(eq(registrations.id, access.registrationId));
    await tx.update(accessSessions).set({ usedAt: issuedAt }).where(eq(accessSessions.id, access.sessionId));
    await tx.insert(auditLogs).values({
      organizationId: access.organizationId,
      actorId: "participant",
      entityType: "certificate",
      entityId: certificate.id,
      action: "certificate.issued",
      after: { publicCode, displayedName: parsed.data.displayName },
      contextHash: requestContextHash(request),
    });
  });

  return Response.json({
    code: publicCode,
    downloadUrl: `/api/public/certificates/${publicCode}/download`,
    validationUrl: `/validar/${publicCode}`,
  });
}
