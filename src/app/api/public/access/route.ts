import { NextResponse } from "next/server";
import { z } from "zod";
import type { Certificate, Event, Registration } from "@/db/schema";
import { createRecord, findRecords } from "@/lib/firestore-data";
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
  const windowStart = new Date(Date.now() - 10 * 60 * 1000);
  const recentAttempts = await findRecords<{
    id: string;
    createdAt: Date;
    contextHash?: string;
  }>("access_attempts", { emailHash });
  const attempts = recentAttempts.filter(
    (item) =>
      item.createdAt > windowStart &&
      item.contextHash === contextHash,
  ).length;

  if (attempts >= 10) {
    return NextResponse.json(
      { ok: false, message: "Muitas tentativas. Aguarde 10 minutos." },
      { status: 429 },
    );
  }

  const [organization] = await findRecords<{ id: string }>("organizations", { slug: parsed.data.organizationSlug });
  const [event] = organization ? await findRecords<Event>("events", { organizationId: organization.id, slug: parsed.data.eventSlug, status: "published" }) : [];
  const eventRegistrations = event ? await findRecords<Registration>("registrations", { eventId: event.id }) : [];
  const registration = eventRegistrations.find((item) =>
    (item.buyerEmail === email || item.participantEmail === email) &&
    (item.eligibility === "eligible" || item.eligibility === "issued"),
  );
  const match = event && registration ? { registrationId: registration.id, eventId: event.id, eventName: event.name, originalName: registration.originalName, confirmedName: registration.confirmedName } : null;

  await createRecord("access_attempts", {
    eventId: match?.eventId,
    emailHash,
    contextHash,
    successful: Boolean(match),
    createdAt: new Date(),
  });

  if (!match) return NextResponse.json({ ok: false, message: genericMessage });

  const token = createAccessToken();
  await createRecord("access_sessions", {
    registrationId: match.registrationId,
    tokenHash: hashValue(token),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    createdAt: new Date(),
  });

  const [existingCertificate] = await findRecords<Certificate>("certificates", { registrationId: match.registrationId, status: "valid" });

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
