import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CircleCheck,
  ShieldCheck,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { CertificateAccessFlow } from "@/components/certificate-access-flow";
import { Badge } from "@/components/ui/badge";
import type { Event } from "@/db/schema";
import { findRecords } from "@/lib/firestore-data";

export const metadata: Metadata = { title: "Emitir certificado" };

export default async function EventIssuePage({
  params,
}: {
  params: Promise<{ organizationSlug: string; eventSlug: string }>;
}) {
  const { organizationSlug, eventSlug } = await params;
  const [organization] = await findRecords<{ id: string; name: string; slug: string }>("organizations", { slug: organizationSlug });
  const [storedEvent] = organization ? await findRecords<Event>("events", { organizationId: organization.id, slug: eventSlug, status: "published" }) : [];
  const event = storedEvent && { ...storedEvent, organizationName: organization!.name };

  if (!event) notFound();

  return (
    <main className="certificate-grid min-h-dvh bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between border-b border-border/60 bg-background/85 px-4 py-4 backdrop-blur-xl sm:px-5 lg:px-8">
        <Link href="/">
          <Brand />
        </Link>
        <Link
          className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          href="/"
        >
          <ArrowLeft className="size-4" /> Início
        </Link>
      </div>
      <div className="mx-auto grid max-w-6xl gap-7 px-4 pb-12 pt-6 sm:px-5 sm:pt-9 lg:grid-cols-[.85fr_1.15fr] lg:gap-12 lg:px-8 lg:pt-16">
        <section className="rounded-3xl bg-background/70 p-1 backdrop-blur-sm lg:pt-5">
          <Badge
            variant="outline"
            className="border-brand-blue-border bg-brand-blue-soft text-brand-blue-accessible"
          >
            Emissão exclusiva deste evento
          </Badge>
          <h1 className="mt-4 text-[2rem] font-semibold leading-[1.08] tracking-[-.045em] text-brand-navy sm:mt-5 sm:text-5xl">
            {event.name}
          </h1>
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            {event.organizationName}
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm text-muted-foreground sm:mt-7 sm:gap-3">
            <span className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <CalendarDays className="size-4 text-brand-blue-accessible" />
              {event.startsAt.toLocaleDateString("pt-BR")}
            </span>
            <span className="rounded-lg border bg-card px-3 py-2">
              {event.workloadHours} horas
            </span>
          </div>
          <p className="mt-5 max-w-md text-sm leading-6 text-muted-foreground sm:mt-7 sm:text-base sm:leading-7">
            Informe o e-mail usado neste evento. A busca fica restrita aos
            participantes desta edição.
          </p>
          <div className="mt-5 hidden space-y-4 text-sm sm:block lg:mt-8">
            <p className="flex gap-3">
              <CircleCheck className="size-5 shrink-0 text-brand-blue-accessible" />
              O evento já está definido pelo endereço desta página.
            </p>
            <p className="flex gap-3">
              <ShieldCheck className="size-5 shrink-0 text-brand-blue-accessible" />
              Participações em outros eventos não interferem nesta emissão.
            </p>
          </div>
        </section>
        <CertificateAccessFlow
          organizationSlug={organizationSlug}
          eventSlug={eventSlug}
        />
      </div>
    </main>
  );
}
