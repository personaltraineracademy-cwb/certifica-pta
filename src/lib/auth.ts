import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { firebaseAdminAuth, firestore } from "@/lib/firebase-admin";

export const requireOrganization = cache(async function requireOrganization() {
  const token = (await cookies()).get("certifica_admin")?.value;
  if (!token) redirect("/sign-in");
  let decoded;
  try { decoded = await firebaseAdminAuth().verifySessionCookie(token, true); }
  catch { redirect("/sign-in"); }
  const organizationId = String(decoded.organizationId ?? "");
  if (!organizationId || decoded.role !== "admin") redirect("/sign-in");
  const snapshot = await firestore().collection("certifica_organizations").doc(organizationId).get();
  if (!snapshot.exists) redirect("/sign-in");
  const data = snapshot.data()!;
  return {
    session: { userId: decoded.uid, orgId: organizationId, orgSlug: data.slug },
    organization: { id: snapshot.id, ...data } as { id: string; name: string; slug: string },
  };
});
