import { cookies } from "next/headers";
import { firebaseAdminAuth } from "@/lib/firebase-admin";

const COOKIE = "certifica_admin";

export async function POST(request: Request) {
  const { idToken } = await request.json().catch(() => ({ idToken: "" }));
  if (typeof idToken !== "string" || !idToken) {
    return Response.json({ error: "Token ausente" }, { status: 400 });
  }
  const auth = firebaseAdminAuth();
  const decoded = await auth.verifyIdToken(idToken);
  if (!decoded.organizationId || decoded.role !== "admin") {
    return Response.json({ error: "Conta sem acesso administrativo" }, { status: 403 });
  }
  const expiresIn = 5 * 24 * 60 * 60 * 1000;
  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });
  (await cookies()).set(COOKIE, sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: expiresIn / 1000,
  });
  return Response.json({ ok: true });
}

export async function DELETE() {
  (await cookies()).set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
  return Response.json({ ok: true });
}
