import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

export type CertificateTemplateConfig = {
  accent: string;
  orientation: "landscape" | "portrait";
  footer?: string;
  name?: { y: number; fontSize: number; color: string };
  code?: { x: number; y: number; fontSize: number; color: string };
};

export const eventStatus = pgEnum("event_status", [
  "draft",
  "review",
  "scheduled",
  "published",
  "closed",
  "archived",
]);

export const eligibilityStatus = pgEnum("eligibility_status", [
  "pending",
  "eligible",
  "ineligible",
  "blocked",
  "issued",
  "revoked",
]);

export const certificateStatus = pgEnum("certificate_status", [
  "valid",
  "revoked",
  "replaced",
]);

export const organizations = pgTable(
  "organizations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkOrgId: text("clerk_org_id").notNull().unique(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    legalName: text("legal_name"),
    taxId: text("tax_id"),
    supportEmail: text("support_email"),
    privacyContact: text("privacy_contact"),
    retentionDays: integer("retention_days").notNull().default(730),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("organizations_slug_idx").on(table.slug)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    edition: text("edition"),
    description: text("description"),
    modality: text("modality").notNull().default("online"),
    location: text("location"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    timezone: text("timezone").notNull().default("America/Sao_Paulo"),
    workloadHours: integer("workload_hours").notNull().default(1),
    issuerName: text("issuer_name").notNull(),
    signatoryName: text("signatory_name"),
    signatoryRole: text("signatory_role"),
    supportChannel: text("support_channel"),
    status: eventStatus("status").notNull().default("draft"),
    issuanceOpensAt: timestamp("issuance_opens_at", { withTimezone: true }),
    issuanceClosesAt: timestamp("issuance_closes_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("events_org_slug_idx").on(table.organizationId, table.slug),
    index("events_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const importBatches = pgTable("import_batches", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  filename: text("filename").notNull(),
  totalRows: integer("total_rows").notNull(),
  validRows: integer("valid_rows").notNull(),
  invalidRows: integer("invalid_rows").notNull(),
  duplicateRows: integer("duplicate_rows").notNull().default(0),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    importBatchId: uuid("import_batch_id").references(() => importBatches.id, {
      onDelete: "set null",
    }),
    buyerEmail: text("buyer_email").notNull(),
    participantEmail: text("participant_email"),
    originalName: text("original_name"),
    confirmedName: text("confirmed_name"),
    orderReference: text("order_reference"),
    ticketCode: text("ticket_code").notNull(),
    ticketType: text("ticket_type"),
    purchaseStatus: text("purchase_status"),
    attendanceStatus: text("attendance_status"),
    eligibility: eligibilityStatus("eligibility").notNull().default("pending"),
    individualWorkloadHours: integer("individual_workload_hours"),
    customFields: jsonb("custom_fields")
      .$type<Record<string, string>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("registrations_event_ticket_idx").on(
      table.eventId,
      table.ticketCode,
    ),
    index("registrations_event_buyer_email_idx").on(
      table.eventId,
      table.buyerEmail,
    ),
    index("registrations_event_participant_email_idx").on(
      table.eventId,
      table.participantEmail,
    ),
    index("registrations_event_eligibility_idx").on(
      table.eventId,
      table.eligibility,
    ),
  ],
);

export const certificateTemplates = pgTable(
  "certificate_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    version: integer("version").notNull().default(1),
    name: text("name").notNull().default("Modelo principal"),
    config: jsonb("config")
      .$type<CertificateTemplateConfig>()
      .notNull()
      .default({ accent: "#0079FD", orientation: "landscape" }),
    backgroundData: bytea("background_data"),
    backgroundStoragePath: text("background_storage_path"),
    backgroundMime: text("background_mime"),
    backgroundFilename: text("background_filename"),
    isPublished: boolean("is_published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("templates_event_version_idx").on(table.eventId, table.version),
  ],
);

export const certificates = pgTable(
  "certificates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "restrict" }),
    templateId: uuid("template_id")
      .notNull()
      .references(() => certificateTemplates.id, { onDelete: "restrict" }),
    publicCode: text("public_code").notNull().unique(),
    status: certificateStatus("status").notNull().default("valid"),
    version: integer("version").notNull().default(1),
    displayedName: text("displayed_name").notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    pdfData: bytea("pdf_data").notNull(),
    documentHash: text("document_hash").notNull(),
    previousCertificateId: uuid("previous_certificate_id"),
    revocationReason: text("revocation_reason"),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [
    index("certificates_registration_idx").on(table.registrationId),
    index("certificates_public_status_idx").on(table.publicCode, table.status),
  ],
);

export const certificateDownloads = pgTable("certificate_downloads", {
  id: uuid("id").defaultRandom().primaryKey(),
  certificateId: uuid("certificate_id")
    .notNull()
    .references(() => certificates.id, { onDelete: "cascade" }),
  downloadedAt: timestamp("downloaded_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  contextHash: text("context_hash"),
});

export const accessSessions = pgTable(
  "access_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("access_sessions_registration_idx").on(table.registrationId),
  ],
);

export const accessAttempts = pgTable(
  "access_attempts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "cascade",
    }),
    emailHash: text("email_hash").notNull(),
    contextHash: text("context_hash"),
    successful: boolean("successful").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("access_attempts_limit_idx").on(table.emailHash, table.createdAt),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),
    actorId: text("actor_id").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: text("action").notNull(),
    before: jsonb("before"),
    after: jsonb("after"),
    contextHash: text("context_hash"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_org_created_idx").on(table.organizationId, table.createdAt),
  ],
);

export type Event = typeof events.$inferSelect;
export type Registration = typeof registrations.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type CertificateTemplate = typeof certificateTemplates.$inferSelect;
