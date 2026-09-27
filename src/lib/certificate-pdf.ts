import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import type { CertificateTemplateConfig } from "@/db/schema";

export type CertificatePdfInput = {
  participantName: string;
  eventName: string;
  eventEdition?: string | null;
  issuerName: string;
  workloadHours: number;
  startsAt: Date;
  endsAt: Date;
  issuedAt: Date;
  publicCode: string;
  validationUrl: string;
  signatoryName?: string | null;
  signatoryRole?: string | null;
  templateBackground?: Buffer | null;
  templateMime?: string | null;
  templateConfig?: CertificateTemplateConfig | null;
};

function centeredX(text: string, size: number, width: number, font: PDFFont) {
  return (width - font.widthOfTextAtSize(text, size)) / 2;
}

function colorFromHex(hex: string | undefined) {
  const normalized = /^#[0-9a-fA-F]{6}$/.test(hex ?? "") ? hex!.slice(1) : "111827";
  return rgb(
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
  );
}

function fittedFontSize(text: string, preferred: number, maxWidth: number, font: PDFFont) {
  let size = preferred;
  while (size > 14 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
  return size;
}

async function drawUploadedTemplate(
  document: PDFDocument,
  input: CertificatePdfInput,
  font: PDFFont,
  bold: PDFFont,
) {
  const page = document.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();
  const background = input.templateMime === "image/png"
    ? await document.embedPng(input.templateBackground!)
    : await document.embedJpg(input.templateBackground!);
  page.drawImage(background, { x: 0, y: 0, width, height });

  const nameConfig = input.templateConfig?.name ?? {
    y: 45,
    fontSize: 30,
    color: "#111827",
  };
  const codeConfig = input.templateConfig?.code ?? {
    x: 5,
    y: 94,
    fontSize: 9,
    color: "#111827",
  };
  const nameSize = fittedFontSize(
    input.participantName,
    nameConfig.fontSize,
    width * 0.82,
    bold,
  );
  page.drawText(input.participantName, {
    x: centeredX(input.participantName, nameSize, width, bold),
    y: height * (1 - nameConfig.y / 100) - nameSize * 0.33,
    size: nameSize,
    font: bold,
    color: colorFromHex(nameConfig.color),
  });
  page.drawText(input.publicCode, {
    x: width * (codeConfig.x / 100),
    y: height * (1 - codeConfig.y / 100),
    size: codeConfig.fontSize,
    font,
    color: colorFromHex(codeConfig.color),
  });
}

async function drawDefaultTemplate(
  document: PDFDocument,
  input: CertificatePdfInput,
  font: PDFFont,
  bold: PDFFont,
) {
  const page = document.addPage([841.89, 595.28]);
  const { width, height } = page.getSize();

  page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.975, 0.98, 0.97) });
  page.drawRectangle({ x: 18, y: 18, width: width - 36, height: height - 36, borderColor: rgb(0.05, 0.42, 0.39), borderWidth: 2 });
  page.drawRectangle({ x: 29, y: 29, width: width - 58, height: height - 58, borderColor: rgb(0.78, 0.68, 0.38), borderWidth: 0.8 });
  page.drawCircle({ x: 72, y: height - 72, size: 20, color: rgb(0.05, 0.42, 0.39) });
  page.drawText("C", { x: 63, y: height - 82, size: 26, font: bold, color: rgb(1, 1, 1) });

  const title = "CERTIFICADO";
  page.drawText(title, { x: centeredX(title, 34, width, bold), y: height - 110, size: 34, font: bold, color: rgb(0.05, 0.32, 0.3) });
  const intro = "Certificamos que";
  page.drawText(intro, { x: centeredX(intro, 14, width, font), y: height - 158, size: 14, font, color: rgb(0.32, 0.36, 0.35) });

  const nameSize = fittedFontSize(input.participantName, 34, width - 300, bold);
  page.drawText(input.participantName, { x: centeredX(input.participantName, nameSize, width, bold), y: height - 212, size: nameSize, font: bold, color: rgb(0.08, 0.13, 0.13) });
  page.drawLine({ start: { x: 150, y: height - 222 }, end: { x: width - 150, y: height - 222 }, thickness: 0.7, color: rgb(0.72, 0.74, 0.72) });

  const eventLabel = `participou de ${input.eventName}${input.eventEdition ? ` - ${input.eventEdition}` : ""},`;
  page.drawText(eventLabel, { x: centeredX(eventLabel, 15, width, font), y: height - 265, size: 15, font, color: rgb(0.22, 0.26, 0.25) });
  const period = `${input.startsAt.toLocaleDateString("pt-BR")} a ${input.endsAt.toLocaleDateString("pt-BR")}, com carga horária de ${input.workloadHours} horas.`;
  page.drawText(period, { x: centeredX(period, 13, width, font), y: height - 294, size: 13, font, color: rgb(0.32, 0.36, 0.35) });

  const issued = `Emitido em ${input.issuedAt.toLocaleDateString("pt-BR")} por ${input.issuerName}`;
  page.drawText(issued, { x: centeredX(issued, 11, width, font), y: 162, size: 11, font, color: rgb(0.38, 0.42, 0.41) });

  if (input.signatoryName) {
    const signatureY = 112;
    page.drawLine({ start: { x: 285, y: signatureY + 19 }, end: { x: 555, y: signatureY + 19 }, thickness: 0.7, color: rgb(0.35, 0.38, 0.37) });
    page.drawText(input.signatoryName, { x: centeredX(input.signatoryName, 11, width, bold), y: signatureY, size: 11, font: bold, color: rgb(0.16, 0.19, 0.18) });
    if (input.signatoryRole) page.drawText(input.signatoryRole, { x: centeredX(input.signatoryRole, 9, width, font), y: signatureY - 15, size: 9, font, color: rgb(0.45, 0.48, 0.47) });
  }

  const qrData = await QRCode.toDataURL(input.validationUrl, { margin: 1, width: 220, errorCorrectionLevel: "M" });
  const qrImage = await document.embedPng(Buffer.from(qrData.split(",")[1], "base64"));
  page.drawImage(qrImage, { x: width - 126, y: 52, width: 72, height: 72 });
  page.drawText(input.publicCode, { x: 54, y: 63, size: 8.5, font, color: rgb(0.33, 0.37, 0.36) });
  page.drawText("Valide pelo QR Code ou em /validar", { x: 54, y: 49, size: 8, font, color: rgb(0.48, 0.51, 0.5) });
}

export async function generateCertificatePdf(input: CertificatePdfInput) {
  const document = await PDFDocument.create();
  document.setTitle(`Certificado - ${input.eventName}`);
  document.setAuthor(input.issuerName);
  document.setSubject(`Certificado ${input.publicCode}`);
  document.setCreationDate(input.issuedAt);
  document.setModificationDate(input.issuedAt);

  const font = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);

  if (input.templateBackground?.length) {
    await drawUploadedTemplate(document, input, font, bold);
  } else {
    await drawDefaultTemplate(document, input, font, bold);
  }

  return Buffer.from(await document.save({ useObjectStreams: false }));
}
