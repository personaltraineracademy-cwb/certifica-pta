import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ScanLine, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { ValidationLookup } from "@/components/validation-lookup";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Validar certificado" };

export default function ValidatePage() {
  return (
    <main className="certificate-grid min-h-dvh bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 lg:px-8">
        <Link href="/">
          <Brand />
        </Link>
        <Link
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          href="/"
        >
          <ArrowLeft className="size-4" /> Início
        </Link>
      </div>
      <div className="mx-auto max-w-lg px-5 pb-20 pt-14 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-navy text-white">
          <ScanLine className="size-7" />
        </div>
        <h1 className="mt-6 text-4xl font-semibold tracking-[-.05em]">
          Valide um certificado
        </h1>
        <p className="mt-3 text-muted-foreground">
          Digite o código exibido no PDF ou use o QR Code.
        </p>
        <Card className="mt-8 text-left shadow-xl shadow-brand-navy/5">
          <CardHeader>
            <CardTitle>Consulta pública</CardTitle>
            <CardDescription>
              Somente dados necessários à verificação serão exibidos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ValidationLookup />
            <div className="mt-5 flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 shrink-0 text-brand-blue-accessible" />{" "}
              E-mail, pedido e histórico administrativo permanecem privados.
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
