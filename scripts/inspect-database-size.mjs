import pg from 'pg';

const connectionString = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
const client = new pg.Client({ connectionString });
await client.connect();

const database = await client.query(
  'select pg_database_size(current_database())::bigint as bytes',
);
const tables = await client.query(`
  select
    relname as table_name,
    pg_total_relation_size(relid)::bigint as total_bytes,
    pg_relation_size(relid)::bigint as data_bytes,
    pg_indexes_size(relid)::bigint as index_bytes
  from pg_catalog.pg_statio_user_tables
  order by pg_total_relation_size(relid) desc
`);
const certificatePayloads = await client.query(`
  select
    count(*)::int as certificate_count,
    coalesce(sum(octet_length(pdf_data)), 0)::bigint as pdf_bytes,
    coalesce(avg(octet_length(pdf_data)), 0)::bigint as average_pdf_bytes,
    coalesce(max(octet_length(pdf_data)), 0)::bigint as largest_pdf_bytes
  from certificates
`);

console.log(
  JSON.stringify(
    {
      databaseBytes: Number(database.rows[0].bytes),
      certificatePayloads: Object.fromEntries(
        Object.entries(certificatePayloads.rows[0]).map(([key, value]) => [
          key,
          Number(value),
        ]),
      ),
      tables: tables.rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([key, value]) => [
            key,
            key.endsWith('_bytes') ? Number(value) : value,
          ]),
        ),
      ),
    },
    null,
    2,
  ),
);

await client.end();
