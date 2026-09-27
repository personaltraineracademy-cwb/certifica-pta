import fs from "node:fs/promises";
import path from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import pg from "pg";

const serviceAccount = JSON.parse(
  await fs.readFile(path.join(process.cwd(), ".secrets/firebase-admin.json"), "utf8"),
);
const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: "data-base-pta.firebasestorage.app",
});
const firestore = getFirestore(app);
const bucket = getStorage(app).bucket();
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL,
  max: 2,
});

const tables = [
  "organizations",
  "events",
  "import_batches",
  "registrations",
  "certificate_templates",
  "certificates",
  "certificate_downloads",
  "access_sessions",
  "access_attempts",
  "audit_logs",
];

function firestoreValue(value) {
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (Buffer.isBuffer(value)) return value;
  return value;
}

function cleanRow(row) {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, firestoreValue(value)]),
  );
}

async function uploadCertificatePdf(row) {
  const localPath = path.join(
    process.cwd(),
    ".secrets",
    "certificate-pdfs",
    `${row.public_code}.pdf`,
  );
  const storagePath = `certifica/certificates/${row.id}.pdf`;
  const data = await fs.readFile(localPath);
  await bucket.file(storagePath).save(data, {
    resumable: false,
    contentType: "application/pdf",
    metadata: { cacheControl: "private, max-age=3600" },
  });
  return storagePath;
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function writeRows(collectionName, rows) {
  for (let start = 0; start < rows.length; start += 400) {
    const batch = firestore.batch();
    for (const row of rows.slice(start, start + 400)) {
      batch.set(firestore.collection(`certifica_${collectionName}`).doc(row.id), cleanRow(row));
    }
    await batch.commit();
  }
}

try {
  for (const table of tables) {
    const select = table === "certificates"
      ? `SELECT id, registration_id, template_id, public_code, status, version,
          displayed_name, issued_at, document_hash, previous_certificate_id,
          revocation_reason, revoked_at FROM certificates`
      : `SELECT * FROM ${table}`;
    const { rows } = await pool.query(select);
    let prepared = rows;

    if (table === "certificate_templates") {
      prepared = await mapLimit(rows, 4, async (row) => {
        if (!row.background_data) return row;
        const storagePath = `certifica/templates/${row.event_id}/${row.id}.jpg`;
        await bucket.file(storagePath).save(row.background_data, {
          resumable: false,
          contentType: row.background_mime ?? "image/jpeg",
          metadata: { cacheControl: "private, max-age=3600" },
        });
        return { ...row, background_data: undefined, background_storage_path: storagePath };
      });
    }

    if (table === "certificates") {
      prepared = await mapLimit(rows, 3, async (row, index) => {
        const pdfStoragePath = await uploadCertificatePdf(row);
        if ((index + 1) % 50 === 0 || index + 1 === rows.length) {
          console.log(`certificates upload: ${index + 1}/${rows.length}`);
        }
        return { ...row, pdf_data: undefined, pdf_storage_path: pdfStoragePath };
      });
    }

    await writeRows(table, prepared);
    console.log(`${table}: ${prepared.length}`);
  }

  await firestore.collection("certifica_meta").doc("migration").set({
    completedAt: Timestamp.now(),
    source: "postgres",
    version: 1,
  });
  console.log("Migração concluída.");
} finally {
  await pool.end();
}
