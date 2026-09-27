import { and, count, desc, eq, gt, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import {
  accessAttempts,
  accessSessions,
  certificates,
  events,
  organizations,
  registrations,
} from "@/db/schema";
import {
  createAccessToken,
  hashValue,
  normalizeEmail,
  requestContextHash,
} from "@/lib/security";

const inputSchema = z.object({
  email: z.email().max(254),
  organizationSlug: z.string().trim().min(1).max(120),
  eventSlug: z.string().trim().min(1).max(120),
});

const genericMessage =
  "Não foi possível liberar o acesso. Confira os dados ou fale com a organização do evento.";

export async function POST(request: Request) {
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ ok: false, message: genericMessage });

  const email = normalizeEmail(parsed.data.email);
  const emailHash = hashValue(email);
  const contextHash = requestContextHash(request);
  const db = getDb();
  const windowStart = new Date(Date.now() - 10 * 60 * 1000);
  const [{ attempts }] = await db
    .select({ attempts: count() })
    .from(accessAttempts)
    .where(
      and(
        eq(accessAttempts.emailHash, emailHash),
        gt(accessAttempts.createdAt, windowStart),
      ),
    );

  if (attempts >= 10) {
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Aguarde 10 minutos." },
      { status: 429 },
    );
  }

  const [match] = await db
    .select({
      registrationId: registrations.id,
      eventId: events.id,
      eventName: events.name,
      originalName: registrations.originalName,
      confirmedName: registrations.confirmedName,
    })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .innerJoin(organizations, eq(organizations.id, events.organizationId))
    .where(
      and(
        eq(events.status, "published"),
        eq(organizations.slug, parsed.data.organizationSlug),
        eq(events.slug, parsed.data.eventSlug),
        or(
          eq(registrations.buyerEmail, email),
          eq(registrations.participantEmail, email),
        ),
        or(
          eq(registrations.eligibility, "eligible"),
          eq(registrations.eligibility, "issued"),
        ),
      ),
    )
    .orderBy(desc(events.startsAt))
    .limit(1);

  await db.insert(accessAttempts).values({
    eventId: match?.eventId,
    emailHash,
    contextHash,
    successful: Boolean(match),
  });

  if (!match) return NextResponse.json({ ok: false, message: genericMessage });

  const token = createAccessToken();
  await db.insert(accessSessions).values({
    registrationId: match.registrationId,
    tokenHash: hashValue(token),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  const [existingCertificate] = await db
    .select({ publicCode: certificates.publicCode })
    .from(certificates)
    .where(
      and(
        eq(certificates.registrationId, match.registrationId),
        eq(certificates.status, "valid"),
      ),
    )
    .limit(1);

  const response = NextResponse.json({
    ok: true,
    registration: {
      id: match.registrationId,
      eventName: match.eventName,
      name: match.confirmedName ?? match.originalName ?? "",
      existingCertificateCode: existingCertificate?.publicCode ?? null,
    },
  });
  response.cookies.set("certifica_access", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 60,
    path: "/",
  });
  return response;
}
