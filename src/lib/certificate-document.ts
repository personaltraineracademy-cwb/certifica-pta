import "server-only";

import { generateCertificatePdf } from "@/lib/pdf";
import type { CertificateTemplateConfig } from "@/db/schema";
import { downloadPrivateFile } from "@/lib/firebase-storage";

export type CertificateDocumentSource = {
  displayedName: string;
  eventName: string;
  eventEdition: string | null;
  issuerName: string;
  workloadHours: number;
  individualWorkloadHours: number | null;
  startsAt: Date;
  endsAt: Date;
  issuedAt: Date;
  publicCode: string;
  signatoryName: string | null;
  signatoryRole: string | null;
  templateBackground: Buffer | null;
  templateStoragePath: string | null;
  templateMime: string | null;
  templateConfig: CertificateTemplateConfig;
  pdfData: Buffer;
  pdfStoragePath?: string | null;
};

export async function getCertificateDocument(
  source: CertificateDocumentSource,
  baseUrl: string,
) {
  if (source.pdfStoragePath) return downloadPrivateFile(source.pdfStoragePath);
  if (source.pdfData.length > 0) return source.pdfData;

  const templateBackground = source.templateStoragePath
    ? await downloadPrivateFile(source.templateStoragePath)
    : source.templateBackground;

  return generateCertificatePdf({
    participantName: source.displayedName,
    eventName: source.eventName,
    eventEdition: source.eventEdition,
    issuerName: source.issuerName,
    workloadHours: source.individualWorkloadHours ?? source.workloadHours,
    startsAt: source.startsAt,
    endsAt: source.endsAt,
    issuedAt: source.issuedAt,
    publicCode: source.publicCode,
    validationUrl: `${baseUrl}/validar/${source.publicCode}`,
    signatoryName: source.signatoryName,
    signatoryRole: source.signatoryRole,
    templateBackground,
    templateMime: source.templateMime,
    templateConfig: source.templateConfig,
  });
}
