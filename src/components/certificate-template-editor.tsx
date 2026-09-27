"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImageUp, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CertificateTemplateConfig } from "@/db/schema";

type Props = {
  eventId: string;
  imageUrl: string | null;
  filename: string | null;
  config: CertificateTemplateConfig;
};

export function CertificateTemplateEditor({
  eventId,
  imageUrl,
  filename,
  config,
}: Props) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [nameY, setNameY] = useState(config.name?.y ?? 45);
  const [nameFontSize, setNameFontSize] = useState(config.name?.fontSize ?? 30);
  const [codeX, setCodeX] = useState(config.code?.x ?? 5);
  const [codeY, setCodeY] = useState(config.code?.y ?? 94);
  const [codeFontSize, setCodeFontSize] = useState(config.code?.fontSize ?? 9);
  const [textColor, setTextColor] = useState(config.name?.color ?? "#111827");
  const [isPreparingImage, setIsPreparingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    },
    [localPreview],
  );

  const preview = localPreview ?? imageUrl;

  return (
    <form
      action={`/api/admin/events/${eventId}/template`}
      method="post"
      encType="multipart/form-data"
      className="grid gap-5 lg:grid-cols-[1.35fr_.65fr]"
    >
      <div className="overflow-hidden rounded-xl border bg-muted p-3">
        <div className="relative aspect-[1.414/1] overflow-hidden rounded-md bg-card shadow-inner [container-type:inline-size]">
          {preview ? (
            <Image
              alt="Prévia do template do certificado"
              src={preview}
              fill
              sizes="(min-width: 1024px) 65vw, 100vw"
              className="object-fill"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-muted-foreground">
              Envie uma imagem para visualizar o certificado.
            </div>
          )}
          <p
            className="absolute z-10 w-[82%] -translate-x-1/2 -translate-y-1/2 text-center font-bold leading-none"
            style={{
              left: "50%",
              top: `${nameY}%`,
              color: textColor,
              fontSize: `${(nameFontSize / 841.89) * 100}cqw`,
            }}
          >
            NOME DO ALUNO
          </p>
          <p
            className="absolute z-10 font-mono leading-none"
            style={{
              left: `${codeX}%`,
              top: `${codeY}%`,
              color: textColor,
              fontSize: `${(codeFontSize / 841.89) * 100}cqw`,
            }}
          >
            CERT-84F2-A10D-9C7E
          </p>
        </div>
      </div>

      <div className="space-y-5 rounded-xl border bg-card p-5">
        <div>
          <h3 className="font-semibold">Imagem do certificado</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            PNG ou JPG, paisagem, até 10 MB. A imagem fica fixa; só nome e
            código mudam.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="template-file">Selecionar template</Label>
          <Input
            id="template-file"
            name="file"
            type="file"
            accept="image/png,image/jpeg"
            required={!imageUrl}
            onChange={async (event) => {
              const input = event.currentTarget;
              const file = input.files?.[0];
              if (!file) return;
              setImageError(null);
              setIsPreparingImage(true);
              try {
                const preparedFile = await prepareTemplateImage(file);
                const transfer = new DataTransfer();
                transfer.items.add(preparedFile);
                input.files = transfer.files;
                setLocalPreview(URL.createObjectURL(preparedFile));
              } catch {
                input.value = "";
                setLocalPreview(null);
                setImageError(
                  "Não foi possível preparar esta imagem. Use um PNG ou JPG válido.",
                );
              } finally {
                setIsPreparingImage(false);
              }
            }}
          />
          {isPreparingImage && (
            <p className="text-xs text-muted-foreground">
              Otimizando imagem para o envio…
            </p>
          )}
          {imageError && (
            <p className="text-xs text-destructive">{imageError}</p>
          )}
          {filename && (
            <p className="text-xs text-muted-foreground">Atual: {filename}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Altura do nome (%)"
            name="nameY"
            value={nameY}
            min={20}
            max={75}
            onChange={setNameY}
          />
          <Field
            label="Tamanho do nome"
            name="nameFontSize"
            value={nameFontSize}
            min={16}
            max={60}
            onChange={setNameFontSize}
          />
          <Field
            label="Código à esquerda (%)"
            name="codeX"
            value={codeX}
            min={2}
            max={90}
            onChange={setCodeX}
          />
          <Field
            label="Altura do código (%)"
            name="codeY"
            value={codeY}
            min={70}
            max={97}
            onChange={setCodeY}
          />
          <Field
            label="Tamanho do código"
            name="codeFontSize"
            value={codeFontSize}
            min={7}
            max={18}
            onChange={setCodeFontSize}
          />
          <div className="space-y-2">
            <Label htmlFor="textColor">Cor do texto</Label>
            <Input
              id="textColor"
              name="textColor"
              type="color"
              value={textColor}
              onChange={(event) => setTextColor(event.target.value)}
            />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isPreparingImage}>
          {imageUrl ? (
            <Save className="size-4" />
          ) : (
            <ImageUp className="size-4" />
          )}
          {isPreparingImage
            ? "Preparando imagem…"
            : imageUrl
              ? "Salvar ajustes"
              : "Enviar template"}
        </Button>
      </div>
    </form>
  );
}

const MAX_UPLOAD_BYTES = 3 * 1024 * 1024;

async function prepareTemplateImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("invalid-image");

  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2400 / image.width, 1800 / image.height);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas-unavailable");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    let quality = 0.86;
    let blob = await canvasToJpeg(canvas, quality);
    while (blob.size > MAX_UPLOAD_BYTES && quality > 0.5) {
      quality -= 0.08;
      blob = await canvasToJpeg(canvas, quality);
    }
    if (blob.size > MAX_UPLOAD_BYTES) throw new Error("image-too-large");

    const baseName = file.name.replace(/\.[^.]+$/, "") || "template";
    return new File([blob], `${baseName}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } finally {
    image.close();
  }
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("image-conversion"))),
      "image/jpeg",
      quality,
    );
  });
}

function Field({
  label,
  name,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  name: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        name={name}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        required
      />
    </div>
  );
}
