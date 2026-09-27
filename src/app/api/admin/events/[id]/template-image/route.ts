import type { CertificateTemplate, Event } from "@/db/schema";
import { requireOrganization } from "@/lib/auth";
import { downloadPrivateFile } from "@/lib/firebase-storage";
import { findRecords, getRecord } from "@/lib/firestore-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const [{ id }, { organization }] = await Promise.all([params, requireOrganization()]);
  const event = await getRecord<Event>("events", id);
  if (!event || event.organizationId !== organization.id) return new Response("Template não encontrado", { status: 404 });
  const templates = await findRecords<CertificateTemplate>("certificate_templates", { eventId: id });
  const selected = templates.sort((a, b) => b.version - a.version)[0];
  const template = selected && { data: selected.backgroundData, storagePath: selected.backgroundStoragePath, mime: selected.backgroundMime };

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
