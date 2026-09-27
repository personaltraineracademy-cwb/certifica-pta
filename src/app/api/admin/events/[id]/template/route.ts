import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { z } from "zod";
import { getDb } from "@/db";
import { auditLogs, certificateTemplates, events } from "@/db/schema";
import { requireOrganization } from "@/lib/auth";
import { deletePrivateFile, uploadPrivateFile } from "@/lib/firebase-storage";

const templateConfigSchema = z.object({
  nameY: z.coerce.number().min(20).max(75),
  nameFontSize: z.coerce.number().min(16).max(60),
  codeX: z.coerce.number().min(2).max(90),
  codeY: z.coerce.number().min(70).max(97),
  codeFontSize: z.coerce.number().min(7).max(18),
  textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});

function eventUrl(request: Request, eventId: string, query: string) {
  return new URL(`/dashboard/eventos/${eventId}?${query}`, request.url);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: eventId } = await params;
  if (!z.uuid().safeParse(eventId).success) {
    return NextResponse.redirect(
      new URL("/dashboard/eventos", request.url),
      303,
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const parsedConfig = templateConfigSchema.safeParse(
    Object.fromEntries(formData),
  );
  if (!parsedConfig.success) {
    return NextResponse.redirect(
      eventUrl(request, eventId, "erro=template-invalido&aba=template"),
      303,
    );
  }

  const { session, organization } = await requireOrganization();
  const db = getDb();
  const [[event], [template]] = await Promise.all([
    db
      .select({ id: events.id })
      .from(events)
      .where(
        and(eq(events.id, eventId), eq(events.organizationId, organization.id)),
      )
      .limit(1),
    db
      .select()
      .from(certificateTemplates)
      .where(eq(certificateTemplates.eventId, eventId))
      .orderBy(desc(certificateTemplates.version))
      .limit(1),
  ]);
  if (!event || !template) {
    return NextResponse.redirect(
      new URL("/dashboard/eventos", request.url),
      303,
    );
  }

  const hasNewFile = file instanceof File && file.size > 0;
  if (!hasNewFile && !template.backgroundData && !template.backgroundStoragePath) {
    return NextResponse.redirect(
      eventUrl(request, eventId, "erro=template-invalido&aba=template"),
      303,
    );
  }

  let backgroundData = template.backgroundData;
  let backgroundStoragePath = template.backgroundStoragePath;
  let backgroundMime = template.backgroundMime;
  let backgroundFilename = template.backgroundFilename;

  if (hasNewFile) {
    if (
      file.size > 10 * 1024 * 1024 ||
      !["image/png", "image/jpeg"].includes(file.type)
    ) {
      return NextResponse.redirect(
        eventUrl(request, eventId, "erro=template-invalido&aba=template"),
        303,
      );
    }

    try {
      const optimizedBackground = await sharp(Buffer.from(await file.arrayBuffer()))
        .rotate()
        .resize({
          width: 2400,
          height: 1800,
          fit: "inside",
          withoutEnlargement: true,
        })
        .flatten({ background: "#ffffff" })
        .jpeg({ quality: 90, chromaSubsampling: "4:4:4", mozjpeg: true })
        .toBuffer();
      backgroundStoragePath = `templates/${organization.id}/${eventId}/${template.id}.jpg`;
      await uploadPrivateFile(backgroundStoragePath, optimizedBackground, "image/jpeg");
      backgroundData = null;
      backgroundMime = "image/jpeg";
      backgroundFilename = file.name;
    } catch {
      return NextResponse.redirect(
        eventUrl(request, eventId, "erro=template-invalido&aba=template"),
        303,
      );
    }
  }

  const config = {
    ...template.config,
    orientation: "landscape" as const,
    name: {
      y: parsedConfig.data.nameY,
      fontSize: parsedConfig.data.nameFontSize,
      color: parsedConfig.data.textColor,
    },
    code: {
      x: parsedConfig.data.codeX,
      y: parsedConfig.data.codeY,
      fontSize: parsedConfig.data.codeFontSize,
      color: parsedConfig.data.textColor,
    },
  };

  try {
    await db.transaction(async (tx) => {
      await tx
      .update(certificateTemplates)
      .set({ backgroundData, backgroundStoragePath, backgroundMime, backgroundFilename, config })
      .where(eq(certificateTemplates.id, template.id));
    await tx.insert(auditLogs).values({
      organizationId: organization.id,
      actorId: session.userId!,
      entityType: "certificate_template",
      entityId: template.id,
      action: "template.background.updated",
      before: { filename: template.backgroundFilename },
      after: { filename: backgroundFilename, config },
    });
    });
  } catch (error) {
    if (hasNewFile && backgroundStoragePath) {
      await deletePrivateFile(backgroundStoragePath).catch(() => undefined);
    }
    throw error;
  }

  revalidatePath(`/dashboard/eventos/${eventId}`);
  return NextResponse.redirect(
    eventUrl(request, eventId, "aba=template&template=salvo"),
    303,
  );
}
