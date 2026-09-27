import { createHash } from "node:crypto";
import pg from "pg";
import { generateCertificatePdf } from "../src/lib/certificate-pdf";

async function main() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  });
  await client.connect();

const { rows } = await client.query(`
  select
    c.public_code,
    c.displayed_name,
    c.issued_at,
    c.pdf_data,
    e.name as event_name,
    e.edition as event_edition,
    e.issuer_name,
    e.workload_hours,
    e.starts_at,
    e.ends_at,
    e.signatory_name,
    e.signatory_role,
    r.individual_workload_hours,
    t.background_data,
    t.background_mime,
    t.config
  from certificates c
  join registrations r on r.id = c.registration_id
  join events e on e.id = r.event_id
  join certificate_templates t on t.id = c.template_id
  where octet_length(c.pdf_data) > 0
  order by c.issued_at desc
  limit 10
`);

let identical = 0;
for (const row of rows) {
  const regenerated = await generateCertificatePdf({
    participantName: row.displayed_name,
    eventName: row.event_name,
    eventEdition: row.event_edition,
    issuerName: row.issuer_name,
    workloadHours: row.individual_workload_hours ?? row.workload_hours,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    issuedAt: row.issued_at,
    publicCode: row.public_code,
    validationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/validar/${row.public_code}`,
    signatoryName: row.signatory_name,
    signatoryRole: row.signatory_role,
    templateBackground: row.background_data,
    templateMime: row.background_mime,
    templateConfig: row.config,
  });
  const hash = (value: Buffer) => createHash("sha256").update(value).digest("hex");
  if (hash(regenerated) === hash(row.pdf_data)) identical += 1;
}

  console.log(JSON.stringify({ checked: rows.length, identical }, null, 2));
  await client.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
