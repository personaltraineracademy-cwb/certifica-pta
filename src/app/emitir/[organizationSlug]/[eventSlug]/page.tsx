import type { Metadata } from "next";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
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
import { getDb } from "@/db";
import { events, organizations } from "@/db/schema";

export const metadata: Metadata = { title: "Emitir certificado" };

export default async function EventIssuePage({
  params,
}: {
  params: Promise<{ organizationSlug: string; eventSlug: string }>;
}) {
  const { organizationSlug, eventSlug } = await params;
  const db = getDb();
  const [event] = await db
    .select({
      name: events.name,
      startsAt: events.startsAt,
      workloadHours: events.workloadHours,
      organizationName: organizations.name,
    })
    .from(events)
    .innerJoin(organizations, eq(organizations.id, events.organizationId))
    .where(
      and(
        eq(organizations.slug, organizationSlug),
        eq(events.slug, eventSlug),
        eq(events.status, "published"),
      ),
    )
    .limit(1);

  if (!event) notFound();

  return (
    <main className="min-h-dvh bg-background">
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
      <div className="mx-auto grid max-w-6xl gap-12 px-5 pb-16 pt-8 lg:grid-cols-[.85fr_1.15fr] lg:px-8 lg:pt-16">
        <section className="pt-5">
          <Badge
            variant="outline"
            className="border-brand-blue-border bg-brand-blue-soft text-brand-blue-accessible"
          >
            Emissão exclusiva deste evento
          </Badge>
          <h1 className="mt-5 text-4xl font-semibold tracking-[-.05em] text-brand-navy sm:text-5xl">
            {event.name}
          </h1>
          <p className="mt-3 text-sm font-medium text-muted-foreground">
            {event.organizationName}
          </p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <CalendarDays className="size-4 text-brand-blue-accessible" />
              {event.startsAt.toLocaleDateString("pt-BR")}
            </span>
            <span className="rounded-lg border bg-card px-3 py-2">
              {event.workloadHours} horas
            </span>
          </div>
          <p className="mt-7 max-w-md text-base leading-7 text-muted-foreground">
            Informe o e-mail usado neste evento. A busca fica restrita aos
            participantes desta edição.
          </p>
          <div className="mt-8 space-y-4 text-sm">
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
