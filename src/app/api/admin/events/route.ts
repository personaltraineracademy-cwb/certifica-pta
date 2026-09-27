import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, certificateTemplates, events } from "@/db/schema";
import { requireOrganization } from "@/lib/auth";

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

  const db = getDb();
  const slug = `${slugify(parsed.data.name)}-${Date.now().toString(36).slice(-6)}`;
  const event = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(events)
      .values({
        organizationId: organization.id,
        slug,
        ...parsed.data,
      })
      .returning();

    await tx
      .insert(certificateTemplates)
      .values({ eventId: created.id, version: 1 });
    await tx.insert(auditLogs).values({
      organizationId: organization.id,
      actorId: session.userId!,
      entityType: "event",
      entityId: created.id,
      action: "event.created",
      after: { name: created.name, slug },
    });

    return created;
  });

  return NextResponse.redirect(
    new URL(`/dashboard/eventos/${event.id}`, request.url),
    303,
  );
}
