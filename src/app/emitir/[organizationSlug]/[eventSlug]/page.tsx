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
      <div className="mx-auto grid max-w-6xl gap-5 px-4 pb-10 pt-5 sm:px-5 md:grid-cols-[.82fr_1.18fr] md:items-start md:gap-8 md:pt-10 lg:gap-12 lg:px-8 lg:pt-14">
        <section className="rounded-3xl bg-background/70 p-1 backdrop-blur-sm md:sticky md:top-24 lg:pt-3">
          <Badge
            variant="outline"
            className="border-brand-blue-border bg-brand-blue-soft text-brand-blue-accessible"
          >
            Emissão exclusiva deste evento
          </Badge>
          <h1 className="mt-3 text-[1.75rem] font-semibold leading-[1.08] tracking-[-.045em] text-brand-navy sm:text-3xl lg:mt-5 lg:text-5xl">
            {event.name}
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground">
            {event.organizationName}
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground lg:mt-7 lg:gap-3">
            <span className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <CalendarDays className="size-4 text-brand-blue-accessible" />
              {event.startsAt.toLocaleDateString("pt-BR")}
            </span>
            <span className="rounded-lg border bg-card px-3 py-2">
              {event.workloadHours} horas
            </span>
          </div>
          <p className="mt-7 hidden max-w-md text-base leading-7 text-muted-foreground lg:block">
            Informe o e-mail usado neste evento. A busca fica restrita aos
            participantes desta edição.
          </p>
          <div className="mt-8 hidden space-y-4 text-sm lg:block">
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
