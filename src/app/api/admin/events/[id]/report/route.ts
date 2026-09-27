import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { certificates, events, registrations } from "@/db/schema";
import { requireOrganization } from "@/lib/auth";

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { organization } = await requireOrganization();
  const db = getDb();
  const rows = await db
    .select({
      name: registrations.confirmedName,
      originalName: registrations.originalName,
      email: registrations.participantEmail,
      buyerEmail: registrations.buyerEmail,
      ticketCode: registrations.ticketCode,
      eligibility: registrations.eligibility,
      certificateCode: certificates.publicCode,
      certificateStatus: certificates.status,
      issuedAt: certificates.issuedAt,
    })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .leftJoin(certificates, eq(certificates.registrationId, registrations.id))
    .where(and(eq(events.id, id), eq(events.organizationId, organization.id)));
  const header = ["nome", "email", "codigo_ingresso", "elegibilidade", "codigo_certificado", "status_certificado", "emitido_em"];
  const lines = rows.map((row) => [row.name ?? row.originalName, row.email ?? row.buyerEmail, row.ticketCode, row.eligibility, row.certificateCode, row.certificateStatus, row.issuedAt?.toISOString()].map(csvCell).join(","));
  return new Response(`\uFEFF${header.join(",")}\n${lines.join("\n")}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="relatorio-${id}.csv"`, "Cache-Control": "private, no-store" } });
}
