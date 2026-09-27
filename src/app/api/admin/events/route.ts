import { NextResponse } from "next/server";
import { z } from "zod";
import { requireOrganization } from "@/lib/auth";
import { writeBatch } from "@/lib/firestore-data";

const eventSchema = z.object({
  name: z.string().trim().min(3).max(140),
  edition: z.string().trim().max(80).optional(),
  description: z.string().trim().max(2000).optional(),
  modality: z.enum(["presencial", "online", "hibrido"]),
  location: z.string().trim().max(180).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  workloadHours: z.coerce.number().int().min(1).max(1000),
  issuerName: z.string().trim().min(2).max(140),
  signatoryName: z.string().trim().max(140).optional(),
  signatoryRole: z.string().trim().max(140).optional(),
  supportChannel: z.string().trim().min(3).max(180),
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

export async function POST(request: Request) {
  const { session, organization } = await requireOrganization();
  const formData = await request.formData();
  const parsed = eventSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success || parsed.data.endsAt <= parsed.data.startsAt) {
    return NextResponse.redirect(
      new URL("/dashboard/eventos/novo?erro=dados-invalidos", request.url),
      303,
    );
  }

  const slug = `${slugify(parsed.data.name)}-${Date.now().toString(36).slice(-6)}`;
  const eventId = crypto.randomUUID();
  const templateId = crypto.randomUUID();
  const now = new Date();
  await writeBatch([
    { collection: "events", id: eventId, data: { id: eventId, organizationId: organization.id, slug, status: "draft", ...parsed.data, createdAt: now, updatedAt: now } },
    { collection: "certificate_templates", id: templateId, data: { id: templateId, eventId, version: 1, config: {}, isPublished: false, createdAt: now } },
    { collection: "audit_logs", id: crypto.randomUUID(), data: { organizationId: organization.id, actorId: session.userId!, entityType: "event", entityId: eventId, action: "event.created", after: { name: parsed.data.name, slug }, createdAt: now } },
  ]);

  return NextResponse.redirect(
    new URL(`/dashboard/eventos/${eventId}`, request.url),
    303,
  );
}
