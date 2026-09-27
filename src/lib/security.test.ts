import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createAccessToken,
  createCertificateCode,
  hashValue,
  normalizeEmail,
  normalizeTicket,
  secureEqual,
} from "./security";

describe("certificate access security", () => {
  it("normalizes participant identifiers", () => {
    expect(normalizeEmail("  ANA@EXAMPLE.COM ")).toBe("ana@example.com");
    expect(normalizeTicket(" cert-2026-001 ")).toBe("CERT-2026-001");
  });

  it("creates long, non-sequential public credentials", () => {
    expect(createAccessToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(createCertificateCode()).toMatch(/^CERT-[A-F0-9]{8}-[A-F0-9]{8}-[A-F0-9]{8}$/);
  });

  it("hashes deterministically and compares without early string equality", () => {
    const first = hashValue("participant@example.com");
    const second = hashValue("participant@example.com");
    const other = hashValue("other@example.com");

    expect(first).toBe(second);
    expect(first).not.toBe(other);
    expect(secureEqual(first, second)).toBe(true);
    expect(secureEqual(first, other)).toBe(false);
  });
});
