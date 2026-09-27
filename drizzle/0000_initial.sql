DO $$ BEGIN
  CREATE TYPE event_status AS ENUM ('draft', 'review', 'scheduled', 'published', 'closed', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE eligibility_status AS ENUM ('pending', 'eligible', 'ineligible', 'blocked', 'issued', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE certificate_status AS ENUM ('valid', 'revoked', 'replaced');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), clerk_org_id text NOT NULL UNIQUE, slug text NOT NULL UNIQUE,
  name text NOT NULL, legal_name text, tax_id text, support_email text, privacy_contact text,
  retention_days integer NOT NULL DEFAULT 730, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  slug text NOT NULL, name text NOT NULL, edition text, description text, modality text NOT NULL DEFAULT 'online', location text,
  starts_at timestamptz NOT NULL, ends_at timestamptz NOT NULL, timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  workload_hours integer NOT NULL DEFAULT 1, issuer_name text NOT NULL, signatory_name text, signatory_role text, support_channel text,
  status event_status NOT NULL DEFAULT 'draft', issuance_opens_at timestamptz, issuance_closes_at timestamptz, published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(organization_id, slug)
);
CREATE INDEX IF NOT EXISTS events_org_status_idx ON events(organization_id, status);
CREATE TABLE IF NOT EXISTS import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  filename text NOT NULL, total_rows integer NOT NULL, valid_rows integer NOT NULL, invalid_rows integer NOT NULL,
  duplicate_rows integer NOT NULL DEFAULT 0, created_by text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  import_batch_id uuid REFERENCES import_batches(id) ON DELETE SET NULL, buyer_email text NOT NULL, participant_email text,
  original_name text, confirmed_name text, order_reference text, ticket_code text NOT NULL, ticket_type text,
  purchase_status text, attendance_status text, eligibility eligibility_status NOT NULL DEFAULT 'pending', individual_workload_hours integer,
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, ticket_code)
);
CREATE INDEX IF NOT EXISTS registrations_event_buyer_email_idx ON registrations(event_id, buyer_email);
CREATE INDEX IF NOT EXISTS registrations_event_participant_email_idx ON registrations(event_id, participant_email);
CREATE INDEX IF NOT EXISTS registrations_event_eligibility_idx ON registrations(event_id, eligibility);
CREATE TABLE IF NOT EXISTS certificate_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1, name text NOT NULL DEFAULT 'Modelo principal',
  config jsonb NOT NULL DEFAULT '{"accent":"#0079FD","orientation":"landscape"}'::jsonb,
  is_published boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(event_id, version)
);
CREATE TABLE IF NOT EXISTS certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE RESTRICT,
  template_id uuid NOT NULL REFERENCES certificate_templates(id) ON DELETE RESTRICT, public_code text NOT NULL UNIQUE,
  status certificate_status NOT NULL DEFAULT 'valid', version integer NOT NULL DEFAULT 1, displayed_name text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(), pdf_data bytea NOT NULL, document_hash text NOT NULL,
  previous_certificate_id uuid, revocation_reason text, revoked_at timestamptz
);
CREATE INDEX IF NOT EXISTS certificates_registration_idx ON certificates(registration_id);
CREATE INDEX IF NOT EXISTS certificates_public_status_idx ON certificates(public_code, status);
CREATE TABLE IF NOT EXISTS certificate_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), certificate_id uuid NOT NULL REFERENCES certificates(id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now(), context_hash text
);
CREATE TABLE IF NOT EXISTS access_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL, used_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS access_sessions_registration_idx ON access_sessions(registration_id);
CREATE TABLE IF NOT EXISTS access_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid REFERENCES events(id) ON DELETE CASCADE,
  email_hash text NOT NULL, context_hash text, successful boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS access_attempts_limit_idx ON access_attempts(email_hash, created_at);
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id text NOT NULL, entity_type text NOT NULL, entity_id text NOT NULL, action text NOT NULL,
  before jsonb, after jsonb, context_hash text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_org_created_idx ON audit_logs(organization_id, created_at);
