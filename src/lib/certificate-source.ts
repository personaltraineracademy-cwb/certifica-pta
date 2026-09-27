import "server-only";

import type { Certificate, CertificateTemplate, Event, Registration } from "@/db/schema";
import { getRecord } from "@/lib/firestore-data";

export async function getCertificateSource(certificate: Certificate & { pdfStoragePath?: string | null }) {
  const [registration, template] = await Promise.all([
    getRecord<Registration>("registrations", certificate.registrationId),
    getRecord<CertificateTemplate>("certificate_templates", certificate.templateId),
  ]);
  if (!registration || !template) return null;
  const event = await getRecord<Event>("events", registration.eventId);
  if (!event) return null;
  return {
    id: certificate.id,
    registrationId: registration.id,
    pdfData: certificate.pdfData ?? Buffer.alloc(0),
    pdfStoragePath: certificate.pdfStoragePath,
    displayedName: certificate.displayedName,
    issuedAt: certificate.issuedAt,
    publicCode: certificate.publicCode,
    eventName: event.name,
    eventEdition: event.edition,
    issuerName: event.issuerName,
    workloadHours: event.workloadHours,
    individualWorkloadHours: registration.individualWorkloadHours,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    signatoryName: event.signatoryName,
    signatoryRole: event.signatoryRole,
    templateBackground: template.backgroundData,
    templateStoragePath: template.backgroundStoragePath,
    templateMime: template.backgroundMime,
    templateConfig: template.config,
  };
}
