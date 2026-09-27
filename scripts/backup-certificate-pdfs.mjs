import fs from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';

const outputDir = path.join(process.cwd(), '.secrets', 'certificate-pdfs');
await fs.mkdir(outputDir, { recursive: true });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
});
await client.connect();

let cursor = null;
let count = 0;
let bytes = 0;
const manifest = [];

while (true) {
  const { rows } = await client.query(
    `select id, public_code, document_hash, issued_at, pdf_data
     from certificates
     where ($1::uuid is null or id > $1::uuid)
     order by id
     limit 50`,
    [cursor],
  );
  if (rows.length === 0) break;

  for (const row of rows) {
    const filename = `${row.public_code}.pdf`;
    await fs.writeFile(path.join(outputDir, filename), row.pdf_data);
    manifest.push({
      id: row.id,
      publicCode: row.public_code,
      documentHash: row.document_hash,
      issuedAt: row.issued_at,
      filename,
    });
    count += 1;
    bytes += row.pdf_data.length;
  }
  cursor = rows.at(-1).id;
  process.stdout.write(`Backup: ${count} certificados\n`);
}

await fs.writeFile(
  path.join(outputDir, 'manifest.json'),
  `${JSON.stringify(manifest, null, 2)}\n`,
);
await client.end();
console.log(JSON.stringify({ count, bytes, outputDir }, null, 2));
