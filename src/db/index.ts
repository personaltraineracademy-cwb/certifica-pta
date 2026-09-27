import "server-only";

import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { certificaPool?: Pool };

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não configurada");
  const secureConnectionUrl = new URL(connectionString);
  secureConnectionUrl.searchParams.set("sslmode", "verify-full");
  const pool = new Pool({ connectionString: secureConnectionUrl.toString(), max: 10 });
  attachDatabasePool(pool);
  return pool;
}

export function getDb() {
  const pool = globalForDb.certificaPool ?? createPool();
  if (process.env.NODE_ENV !== "production") globalForDb.certificaPool = pool;
  return drizzle(pool, { schema });
}
