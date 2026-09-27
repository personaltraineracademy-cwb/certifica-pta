import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
});
await client.connect();

const certificates = (await client.query('select * from certificates order by id')).rows;
const downloads = (await client.query('select * from certificate_downloads order by id')).rows;

const backupPath = path.join(process.cwd(), '.secrets', 'certificate-records.json');
await fs.writeFile(
  backupPath,
  `${JSON.stringify({
    certificates: certificates.map(({ pdf_data: _pdfData, ...record }) => record),
    downloads,
  }, null, 2)}\n`,
);

function placeholders(rows, columnCount, offset = 0) {
  return rows
    .map((_, rowIndex) =>
      `(${Array.from({ length: columnCount }, (_value, columnIndex) =>
        `$${offset + rowIndex * columnCount + columnIndex + 1}`,
      ).join(',')})`,
    )
    .join(',');
}

await client.query('begin');
try {
  await client.query('truncate table certificate_downloads, certificates');

  for (let index = 0; index < certificates.length; index += 100) {
    const batch = certificates.slice(index, index + 100);
    const values = batch.flatMap((row) => [
      row.id,
      row.registration_id,
      row.template_id,
      row.public_code,
      row.status,
      row.version,
      row.displayed_name,
      row.issued_at,
      Buffer.alloc(0),
      row.document_hash,
      null,
      row.revocation_reason,
      row.revoked_at,
    ]);
    await client.query(
      `insert into certificates (
        id, registration_id, template_id, public_code, status, version,
        displayed_name, issued_at, pdf_data, document_hash,
        previous_certificate_id, revocation_reason, revoked_at
      ) values ${placeholders(batch, 13)}`,
      values,
    );
  }

  for (const row of certificates.filter((item) => item.previous_certificate_id)) {
    await client.query(
      'update certificates set previous_certificate_id = $1 where id = $2',
      [row.previous_certificate_id, row.id],
    );
  }

  for (let index = 0; index < downloads.length; index += 200) {
    const batch = downloads.slice(index, index + 200);
    await client.query(
      `insert into certificate_downloads (id, certificate_id, downloaded_at, context_hash)
       values ${placeholders(batch, 4)}`,
      batch.flatMap((row) => [
        row.id,
        row.certificate_id,
        row.downloaded_at,
        row.context_hash,
      ]),
    );
  }

  await client.query('commit');
  console.log(JSON.stringify({
    certificatesRestored: certificates.length,
    downloadsRestored: downloads.length,
    backupPath,
  }, null, 2));
} catch (error) {
  await client.query('rollback');
  throw error;
} finally {
  await client.end();
}
