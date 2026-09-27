import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import {
  ArrowRight,
  CalendarRange,
  Download,
  FileBadge2,
  UsersRound,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import {
  certificateDownloads,
  certificates,
  events,
  registrations,
} from "@/db/schema";
import { requireOrganization } from "@/lib/auth";

export default async function DashboardPage() {
  const { organization } = await requireOrganization();
  const db = getDb();
  const [stats, recentEvents] = await Promise.all([
    db
      .select({
        events: sql<number>`count(distinct ${events.id})::int`,
        participants: sql<number>`count(distinct ${registrations.id})::int`,
        certificates: sql<number>`count(distinct ${certificates.id})::int`,
        downloads: sql<number>`count(distinct ${certificateDownloads.id})::int`,
      })
      .from(events)
      .leftJoin(registrations, eq(registrations.eventId, events.id))
      .leftJoin(certificates, eq(certificates.registrationId, registrations.id))
      .leftJoin(
        certificateDownloads,
        eq(certificateDownloads.certificateId, certificates.id),
      )
      .where(eq(events.organizationId, organization.id)),
    db
      .select()
      .from(events)
      .where(eq(events.organizationId, organization.id))
      .orderBy(desc(events.createdAt))
      .limit(5),
  ]);
  const summary = stats[0] ?? {
    events: 0,
    participants: 0,
    certificates: 0,
    downloads: 0,
  };
  const cards = [
    { label: "Eventos", value: summary.events, icon: CalendarRange },
    { label: "Participantes", value: summary.participants, icon: UsersRound },
    { label: "Certificados", value: summary.certificates, icon: FileBadge2 },
    { label: "Downloads", value: summary.downloads, icon: Download },
  ];
  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-brand-blue-accessible">
            Operação
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.04em] text-brand-navy">
            Visão geral
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Acompanhe emissão, elegibilidade e downloads.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/eventos/novo">Criar evento</Link>
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center justify-between py-5">
              <div>
                <p className="text-sm text-muted-foreground">{card.label}</p>
                <p className="mt-1 font-heading text-3xl font-bold tracking-[-.04em] text-brand-navy">
                  {card.value}
                </p>
              </div>
              <div className="grid size-10 place-items-center rounded-xl bg-brand-blue-soft text-brand-blue-accessible">
                <card.icon className="size-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Eventos recentes</CardTitle>
            <CardDescription>
              Últimas configurações da organização.
            </CardDescription>
          </div>
          <Button asChild variant="ghost">
            <Link href="/dashboard/eventos">
              Ver todos <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentEvents.length ? (
            <div className="divide-y">
              {recentEvents.map((event) => (
                <Link
                  href={`/dashboard/eventos/${event.id}`}
                  key={event.id}
                  className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-medium">{event.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {event.startsAt.toLocaleDateString("pt-BR")} ·{" "}
                      {event.modality}
                    </p>
                  </div>
                  <Badge
                    variant={
                      event.status === "published" ? "default" : "secondary"
                    }
                    className={
                      event.status === "published" ? "bg-semantic-success" : ""
                    }
                  >
                    {event.status === "published" ? "Publicado" : "Rascunho"}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <CalendarRange className="mx-auto size-8 text-neutral-300" />
              <p className="mt-3 font-medium">Nenhum evento criado</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Comece criando seu primeiro evento.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
