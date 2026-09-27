import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import {
  certificateTemplates,
  events,
  organizations,
  registrations,
} from "../src/db/schema";

async function main() {
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL ausente");

  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool);

  const organizationId = "00000000-0000-4000-8000-000000000001";
  const eventId = "00000000-0000-4000-8000-000000000002";
  const registrationId = "00000000-0000-4000-8000-000000000003";
  const templateId = "00000000-0000-4000-8000-000000000004";

  await db
    .insert(organizations)
    .values({
      id: organizationId,
      clerkOrgId: "org_demo_public",
      slug: "instituto-horizonte",
      name: "Instituto Horizonte",
      supportEmail: "suporte@exemplo.com",
    })
    .onConflictDoNothing();

  await db
    .insert(events)
    .values({
      id: eventId,
      organizationId,
      slug: "summit-curitiba-2026",
      name: "Tech Summit Curitiba 2026",
      edition: "Edição 2026",
      description: "Evento demonstrativo do fluxo completo de certificados.",
      modality: "presencial",
      location: "Curitiba - PR",
      startsAt: new Date("2026-07-20T12:00:00.000Z"),
      endsAt: new Date("2026-07-21T21:00:00.000Z"),
      workloadHours: 16,
      issuerName: "Instituto Horizonte",
      signatoryName: "Marina Costa",
      signatoryRole: "Diretora de Programas",
      supportChannel: "suporte@exemplo.com",
      status: "published",
      publishedAt: new Date("2026-07-22T12:00:00.000Z"),
    })
    .onConflictDoNothing();

  await db
    .insert(certificateTemplates)
    .values({
      id: templateId,
      eventId,
      version: 1,
      isPublished: true,
      config: {
        accent: "#0079FD",
        orientation: "landscape",
        footer: "Certificados PTA",
      },
    })
    .onConflictDoNothing();

  await db
    .insert(registrations)
    .values({
      id: registrationId,
      eventId,
      buyerEmail: "ana@example.com",
      participantEmail: "ana@example.com",
      originalName: "Ana Vitória de Souza",
      orderReference: "PED-1001",
      ticketCode: "CERT-2026-001",
      ticketType: "Participante",
      purchaseStatus: "paid",
      attendanceStatus: "present",
      eligibility: "eligible",
    })
    .onConflictDoNothing();

  console.log(
    "Dados demo prontos: summit-curitiba-2026 / ana@example.com / CERT-2026-001",
  );
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
