import Link from "next/link";
import {
  ArrowRight,
  FileCheck2,
  FileDown,
  ScanLine,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const steps = [
  {
    icon: ShieldCheck,
    number: "01",
    title: "Comprove seu acesso",
    text: "Use o e-mail cadastrado no evento. Seus dados nunca aparecem publicamente.",
  },
  {
    icon: FileCheck2,
    number: "02",
    title: "Confirme seu nome",
    text: "Revise como o nome será exibido antes da primeira emissão.",
  },
  {
    icon: FileDown,
    number: "03",
    title: "Baixe o PDF",
    text: "Receba o certificado com código único e validação pública.",
  },
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main>
        <section className="certificate-grid relative overflow-hidden border-b bg-brand-offwhite">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 py-20 lg:grid-cols-[1.06fr_.94fr] lg:px-8 lg:py-28">
            <div className="relative z-10 flex flex-col justify-center">
              <Badge
                variant="outline"
                className="mb-6 w-fit border-brand-blue-border bg-brand-blue-soft text-brand-blue-accessible"
              >
                Certificação oficial Personal Trainer Academy
              </Badge>
              <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.01] tracking-[-0.055em] text-brand-navy sm:text-6xl lg:text-7xl">
                Sua conquista merece{" "}
                <span className="text-brand-blue-accessible">
                  prova autêntica.
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-neutral-600">
                Emita, baixe e valide certificados em poucos minutos.
                Privacidade para participantes e controle para organizadores.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 px-6">
                  <Link href="/emitir">
                    Como emitir meu certificado{" "}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 bg-white px-6"
                >
                  <Link href="/validar">
                    <ScanLine className="size-4" /> Validar certificado
                  </Link>
                </Button>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-neutral-500">
                <ShieldCheck className="size-4 text-brand-blue-accessible" />{" "}
                Busca protegida. Nenhum e-mail é exposto.
              </p>
            </div>

            <div className="relative mx-auto w-full max-w-xl self-center">
              <Card className="relative overflow-hidden border-brand-blue/20 bg-white py-0 shadow-[0_24px_72px_rgba(0,36,51,.14)]">
                <CardContent className="p-8 sm:p-10">
                  <div className="flex items-center justify-between border-b pb-6">
                    <span className="grid size-12 place-items-center rounded-xl bg-brand-navy">
                      <Brand compact inverse />
                    </span>
                    <span className="font-mono text-xs tracking-wider text-neutral-500">
                      CERT-84F2-A10D-9C7E
                    </span>
                  </div>
                  <div className="py-12 text-center">
                    <p className="text-xs font-semibold uppercase tracking-[.28em] text-brand-blue-accessible">
                      Certificado
                    </p>
                    <p className="mt-5 text-sm text-neutral-500">
                      Certificamos que
                    </p>
                    <p className="mt-3 font-heading text-3xl font-semibold tracking-[-.04em] text-brand-navy">
                      Ana Vitória de Souza
                    </p>
                    <div className="mx-auto mt-3 h-px w-4/5 bg-neutral-200" />
                    <p className="mt-6 text-sm leading-6 text-neutral-600">
                      participou do Intensivo Prático PTA
                      <br />
                      com carga horária de 16 horas.
                    </p>
                  </div>
                  <div className="flex items-end justify-between border-t pt-5 text-xs text-neutral-500">
                    <span>Personal Trainer Academy</span>
                    <ScanLine className="size-11 text-brand-blue-accessible" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section
          id="como-funciona"
          className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"
        >
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[.18em] text-brand-blue-accessible">
              Como funciona
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-[-.04em] text-brand-navy sm:text-4xl">
              Do acesso ao PDF em três passos.
            </h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="bg-card p-7 lg:p-9">
                <div className="flex items-center justify-between">
                  <step.icon className="size-6 text-brand-blue-accessible" />
                  <span className="font-mono text-xs text-neutral-400">
                    {step.number}
                  </span>
                </div>
                <h3 className="mt-10 text-lg font-bold text-brand-navy">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y bg-brand-navy text-white">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 px-5 py-14 md:flex-row md:items-center lg:px-8">
            <div>
              <p className="text-sm font-medium text-blue-300">
                Para organizações
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-[-.03em]">
                Emita com controle, auditoria e identidade própria.
              </h2>
            </div>
            <Button asChild size="lg" variant="secondary">
              <Link href="/sign-up">
                Criar conta de organizador <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row lg:px-8">
        <span>© 2026 Certificados PTA</span>
        <span>Privacidade por padrão · Validação pública mínima</span>
      </footer>
    </div>
  );
}
