import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import sharp from "sharp";
import { generateCertificatePdf } from "../src/lib/certificate-pdf";

async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  if (!inputPath || !outputPath) {
    throw new Error("Uso: tsx scripts/render-template-demo.ts <imagem> <pdf>");
  }

  const background = await sharp(await readFile(resolve(inputPath)))
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
  const now = new Date("2026-07-26T12:00:00.000Z");
  const pdf = await generateCertificatePdf({
    participantName: "Ana Vitória de Souza",
    eventName: "Intensivo Prático Treinamento Feminino",
    issuerName: "Personal Trainer Academy",
    workloadHours: 9,
    startsAt: new Date("2026-07-25T12:00:00.000Z"),
    endsAt: now,
    issuedAt: now,
    publicCode: "CERT-84F2-A10D-9C7E",
    validationUrl:
      "https://certifica-kohl.vercel.app/validar/CERT-84F2-A10D-9C7E",
    templateBackground: background,
    templateMime: "image/jpeg",
    templateConfig: {
      accent: "#0079FD",
      orientation: "landscape",
      name: { y: 45, fontSize: 30, color: "#111827" },
      code: { x: 5, y: 94, fontSize: 9, color: "#111827" },
    },
  });

  const absoluteOutput = resolve(outputPath);
  await mkdir(dirname(absoluteOutput), { recursive: true });
  await writeFile(absoluteOutput, pdf);
  console.log(absoluteOutput);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
