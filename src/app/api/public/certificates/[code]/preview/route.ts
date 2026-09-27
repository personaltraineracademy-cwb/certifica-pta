import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  certificates,
  certificateTemplates,
  events,
  registrations,
} from "@/db/schema";
import { getCertificateDocument } from "@/lib/certificate-document";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const db = getDb();
  const [certificate] = await db
    .select({
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
    .where(
      and(
        eq(certificates.publicCode, code.toUpperCase()),
        eq(certificates.status, "valid"),
      ),
    )
    .limit(1);

  if (!certificate) {
    return Response.json({ error: "Certificado não disponível." }, { status: 404 });
  }

  const pdf = await getCertificateDocument(certificate, new URL(request.url).origin);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
