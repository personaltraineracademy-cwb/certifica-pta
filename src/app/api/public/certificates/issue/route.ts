import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import type { Certificate, CertificateTemplate, Event, Registration } from "@/db/schema";
import { generateCertificatePdf } from "@/lib/pdf";
import { downloadPrivateFile, uploadPrivateFile } from "@/lib/firebase-storage";
import { findRecords, getRecord, writeBatch } from "@/lib/firestore-data";
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

  const [session] = await findRecords<{ id: string; registrationId: string; expiresAt: Date }>("access_sessions", { tokenHash: hashValue(token), registrationId: parsed.data.registrationId });
  const registration = session ? await getRecord<Registration>("registrations", session.registrationId) : null;
  const event = registration ? await getRecord<Event>("events", registration.eventId) : null;
  const templates = event ? await findRecords<CertificateTemplate>("certificate_templates", { eventId: event.id, isPublished: true }) : [];
  const template = templates.sort((a, b) => b.version - a.version)[0];
  const access = session && session.expiresAt > new Date() && registration && event && template ? {
    sessionId: session.id, registrationId: registration.id, eventId: event.id,
    eventName: event.name, eventEdition: event.edition, startsAt: event.startsAt,
    endsAt: event.endsAt, workloadHours: event.workloadHours,
    individualWorkloadHours: registration.individualWorkloadHours,
    issuerName: event.issuerName, signatoryName: event.signatoryName,
    signatoryRole: event.signatoryRole, organizationId: event.organizationId,
    templateId: template.id, templateBackground: template.backgroundData,
    templateStoragePath: template.backgroundStoragePath, templateMime: template.backgroundMime,
    templateConfig: template.config,
  } : null;

  if (!access) return Response.json({ error: "Acesso inválido ou expirado." }, { status: 401 });

  const [existing] = await findRecords<Certificate>("certificates", { registrationId: access.registrationId, status: "valid" });
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

  const certificateId = crypto.randomUUID();
  const pdfStoragePath = `certifica/certificates/${certificateId}.pdf`;
  await uploadPrivateFile(pdfStoragePath, pdf, "application/pdf");
  await writeBatch([
    { collection: "certificates", id: certificateId, data: { id: certificateId, registrationId: access.registrationId, templateId: access.templateId, publicCode, status: "valid", version: 1, displayedName: parsed.data.displayName, issuedAt, pdfStoragePath, documentHash } },
    { collection: "registrations", id: access.registrationId, data: { confirmedName: parsed.data.displayName, eligibility: "issued", updatedAt: issuedAt } },
    { collection: "access_sessions", id: access.sessionId, data: { usedAt: issuedAt } },
    { collection: "audit_logs", id: crypto.randomUUID(), data: { organizationId: access.organizationId, actorId: "participant", entityType: "certificate", entityId: certificateId, action: "certificate.issued", after: { publicCode, displayedName: parsed.data.displayName }, contextHash: requestContextHash(request), createdAt: issuedAt } },
  ]);

  return Response.json({
    code: publicCode,
    downloadUrl: `/api/public/certificates/${publicCode}/download`,
    validationUrl: `/validar/${publicCode}`,
  });
}
