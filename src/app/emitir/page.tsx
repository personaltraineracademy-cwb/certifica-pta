import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Link2, ShieldCheck } from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Emitir certificado" };

export default function IssuePage() {
  return (
    <main className="certificate-grid min-h-dvh bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 lg:px-8">
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
      <div className="mx-auto grid min-h-[calc(100dvh-96px)] max-w-xl place-items-center px-5 pb-20">
        <Card className="w-full shadow-xl shadow-brand-navy/5">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 grid size-12 place-items-center rounded-xl bg-brand-blue-soft text-brand-blue-accessible">
              <Link2 className="size-6" />
            </div>
            <CardTitle className="text-2xl">Use o link do seu evento</CardTitle>
            <CardDescription className="mx-auto max-w-md leading-6">
              Cada evento possui uma página exclusiva de emissão. Abra o link
              enviado pela organização para acessar o certificado correto.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-start gap-3 rounded-lg bg-muted p-4 text-sm leading-6 text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-blue-accessible" />
              Seu e-mail será consultado somente entre os participantes daquele
              evento, mesmo que você tenha participado de outros.
            </div>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Voltar para o início</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
