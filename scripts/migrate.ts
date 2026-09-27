import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

async function main() {
  const connectionString =
    process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!connectionString)
    throw new Error("DATABASE_URL_UNPOOLED ou DATABASE_URL ausente");

  const pool = new Pool({ connectionString, max: 1 });
  const db = drizzle(pool);

  await db.execute(
    sql.raw(`
  CREATE TABLE IF NOT EXISTS certifica_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  );
  `),
  );

  const migrationDir = join(process.cwd(), "drizzle");
  const migrationFiles = (await readdir(migrationDir))
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .sort();

  for (const migrationFile of migrationFiles) {
    const migrationName = migrationFile.replace(/\.sql$/, "");
    const applied = await db.execute<{ name: string }>(
      sql`SELECT name FROM certifica_migrations WHERE name = ${migrationName}`,
    );

    if (applied.rows.length > 0) {
      console.log(`Migração já aplicada: ${migrationName}`);
      continue;
    }

    const migration = await readFile(join(migrationDir, migrationFile), "utf8");
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(migration));
      await tx.execute(
        sql`INSERT INTO certifica_migrations (name) VALUES (${migrationName})`,
      );
    });
    console.log(`Migração aplicada: ${migrationName}`);
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
