import { and, eq, gt } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "@/db";
import {
  accessSessions,
  certificateDownloads,
  certificates,
  certificateTemplates,
  events,
  registrations,
} from "@/db/schema";
import { getCertificateDocument } from "@/lib/certificate-document";
import { hashValue, requestContextHash } from "@/lib/security";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const token = request.cookies.get("certifica_access")?.value;
  if (!token) return Response.json({ error: "Acesso expirado." }, { status: 401 });

  const db = getDb();
  const [certificate] = await db
    .select({
      id: certificates.id,
      pdfData: certificates.pdfData,
      displayedName: certificates.displayedName,
      issuedAt: certificates.issuedAt,
      publicCode: certificates.publicCode,
      eventName: events.name,
      eventEdition: events.edition,
      issuerName: events.issuerName,
      workloadHours: events.workloadHours,
      individualWorkloadHours: registrations.individualWorkloadHours,
      startsAt: events.startsAt,
      endsAt: events.endsAt,
      signatoryName: events.signatoryName,
      signatoryRole: events.signatoryRole,
      templateBackground: certificateTemplates.backgroundData,
      templateStoragePath: certificateTemplates.backgroundStoragePath,
      templateMime: certificateTemplates.backgroundMime,
      templateConfig: certificateTemplates.config,
    })
    .from(certificates)
    .innerJoin(registrations, eq(registrations.id, certificates.registrationId))
    .innerJoin(events, eq(events.id, registrations.eventId))
    .innerJoin(certificateTemplates, eq(certificateTemplates.id, certificates.templateId))
    .innerJoin(accessSessions, eq(accessSessions.registrationId, registrations.id))
    .where(
      and(
        eq(certificates.publicCode, code),
        eq(certificates.status, "valid"),
        eq(accessSessions.tokenHash, hashValue(token)),
        gt(accessSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!certificate) return Response.json({ error: "Certificado não disponível." }, { status: 404 });
  await db.insert(certificateDownloads).values({
    certificateId: certificate.id,
    contextHash: requestContextHash(request),
  });

  const pdf = await getCertificateDocument(certificate, new URL(request.url).origin);

  const safeName = certificate.displayedName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="certificado-${safeName}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
