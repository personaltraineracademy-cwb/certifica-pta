import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { certificateTemplates, events } from "@/db/schema";
import { requireOrganization } from "@/lib/auth";
import { downloadPrivateFile } from "@/lib/firebase-storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [{ id }, { organization }] = await Promise.all([params, requireOrganization()]);
  const db = getDb();
  const [template] = await db
    .select({ data: certificateTemplates.backgroundData, storagePath: certificateTemplates.backgroundStoragePath, mime: certificateTemplates.backgroundMime })
    .from(certificateTemplates)
    .innerJoin(events, eq(events.id, certificateTemplates.eventId))
    .where(and(eq(events.id, id), eq(events.organizationId, organization.id)))
    .orderBy(desc(certificateTemplates.version))
    .limit(1);

  if (!template?.mime || (!template.data && !template.storagePath)) {
    return new Response("Template não encontrado", { status: 404 });
  }

  const data = template.storagePath
    ? await downloadPrivateFile(template.storagePath)
    : template.data!;

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": template.mime,
      "Cache-Control": "private, no-store",
      "Content-Disposition": "inline",
    },
  });
}
