import { NextRequest } from "next/server";
import type { Certificate } from "@/db/schema";
import { getCertificateDocument } from "@/lib/certificate-document";
import { getCertificateSource } from "@/lib/certificate-source";
import { createRecord, findRecords } from "@/lib/firestore-data";
import { hashValue, requestContextHash } from "@/lib/security";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const token = request.cookies.get("certifica_access")?.value;
  if (!token) return Response.json({ error: "Acesso expirado." }, { status: 401 });

  const [stored] = await findRecords<Certificate & { pdfStoragePath?: string | null }>("certificates", { publicCode: code, status: "valid" });
  const [session] = stored ? await findRecords<{ id: string; registrationId: string; expiresAt: Date }>("access_sessions", { registrationId: stored.registrationId, tokenHash: hashValue(token) }) : [];
  const certificate = stored && session && session.expiresAt > new Date() ? await getCertificateSource(stored) : null;

  if (!certificate) return Response.json({ error: "Certificado não disponível." }, { status: 404 });
  await createRecord("certificate_downloads", {
    certificateId: certificate.id,
    contextHash: requestContextHash(request),
    downloadedAt: new Date(),
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
