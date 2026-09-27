ALTER TABLE "certificate_templates"
  ADD COLUMN IF NOT EXISTS "background_data" bytea,
  ADD COLUMN IF NOT EXISTS "background_mime" text,
  ADD COLUMN IF NOT EXISTS "background_filename" text;
