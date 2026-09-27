import type { Certificate, Event, Registration } from "@/db/schema";
import { requireOrganization } from "@/lib/auth";
import { findRecords, getRecord, listRecords } from "@/lib/firestore-data";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization } = await requireOrganization();
  const event = await getRecord<Event>("events", id);
  if (!event || event.organizationId !== organization.id) return new Response("Evento não encontrado", { status: 404 });
  const [registrations, certificates] = await Promise.all([
    findRecords<Registration>("registrations", { eventId: id }),
    listRecords<Certificate>("certificates"),
  ]);
  const certificateByRegistration = new Map(certificates.map((item) => [item.registrationId, item]));
  const rows = registrations.map((item) => {
    const certificate = certificateByRegistration.get(item.id);
    return { name: item.confirmedName, originalName: item.originalName, email: item.participantEmail, buyerEmail: item.buyerEmail, ticketCode: item.ticketCode, eligibility: item.eligibility, certificateCode: certificate?.publicCode, certificateStatus: certificate?.status, issuedAt: certificate?.issuedAt };
  });
  const header = ["nome", "email", "codigo_ingresso", "elegibilidade", "codigo_certificado", "status_certificado", "emitido_em"];
  const lines = rows.map((row) => [row.name ?? row.originalName, row.email ?? row.buyerEmail, row.ticketCode, row.eligibility, row.certificateCode, row.certificateStatus, row.issuedAt?.toISOString()].map(csvCell).join(","));
  return new Response(`\uFEFF${header.join(",")}\n${lines.join("\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="relatorio-${id}.csv"`, "Cache-Control": "private, no-store" } });
}
