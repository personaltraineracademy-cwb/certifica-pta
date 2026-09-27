import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { generateCertificatePdf } from "./certificate-pdf";

describe("generateCertificatePdf", () => {
  it("uses an uploaded background and creates one landscape page", async () => {
    const background = await sharp({
      create: { width: 1200, height: 850, channels: 3, background: "#f8f5ee" },
    })
      .jpeg()
      .toBuffer();
    const now = new Date("2026-07-26T12:00:00.000Z");
    const pdf = await generateCertificatePdf({
      participantName: "Ana Vitória de Souza",
      eventName: "Treinamento Feminino",
      issuerName: "Personal Trainer Academy",
      workloadHours: 9,
      startsAt: now,
      endsAt: now,
      issuedAt: now,
      publicCode: "CERT-84F2-A10D-9C7E",
      validationUrl: "https://example.com/validar/CERT-84F2-A10D-9C7E",
      templateBackground: background,
      templateMime: "image/jpeg",
      templateConfig: {
        accent: "#0079FD",
        orientation: "landscape",
        name: { y: 45, fontSize: 30, color: "#111827" },
        code: { x: 5, y: 94, fontSize: 9, color: "#111827" },
      },
    });

    const loaded = await PDFDocument.load(pdf);
    const [page] = loaded.getPages();
    expect(loaded.getPageCount()).toBe(1);
    expect(page.getWidth()).toBeGreaterThan(page.getHeight());
    expect(pdf.length).toBeGreaterThan(background.length);
  });
});
