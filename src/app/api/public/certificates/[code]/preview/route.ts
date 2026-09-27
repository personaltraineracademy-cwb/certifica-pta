import type { Certificate } from "@/db/schema";
import { getCertificateDocument } from "@/lib/certificate-document";
import { getCertificateSource } from "@/lib/certificate-source";
import { findRecords } from "@/lib/firestore-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const [stored] = await findRecords<Certificate & { pdfStoragePath?: string | null }>("certificates", { publicCode: code.toUpperCase(), status: "valid" });
  const certificate = stored ? await getCertificateSource(stored) : null;

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
