import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase("pt-BR");
}

export function normalizeTicket(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export function hashValue(value: string) {
  return createHash("sha256")
    .update(`${process.env.CERTIFICA_HASH_SALT ?? "certifica-development"}:${value}`)
    .digest("hex");
}

export function secureEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createAccessToken() {
  return randomBytes(32).toString("base64url");
}

export function createCertificateCode() {
  const token = randomBytes(12).toString("hex").toUpperCase();
  return `CERT-${token.slice(0, 8)}-${token.slice(8, 16)}-${token.slice(16)}`;
}

export function requestContextHash(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const userAgent = request.headers.get("user-agent") ?? "unknown";
  return hashValue(`${forwarded ?? "local"}:${userAgent}`);
}
