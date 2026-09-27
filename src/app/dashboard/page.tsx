import Link from "next/link";
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
import { requireOrganization } from "@/lib/auth";
import { findRecords, listRecords } from "@/lib/firestore-data";
import type { Event } from "@/db/schema";

export default async function DashboardPage() {
  const { organization } = await requireOrganization();
  const [organizationEvents, allRegistrations, allCertificates, allDownloads] = await Promise.all([
    findRecords<Event>("events", { organizationId: organization.id }),
    listRecords<{ id: string; eventId: string }>("registrations"),
    listRecords<{ id: string; registrationId: string }>("certificates"),
    listRecords<{ id: string; certificateId: string }>("certificate_downloads"),
  ]);
  const eventIds = new Set(organizationEvents.map((event) => event.id));
  const organizationRegistrations = allRegistrations.filter((item) => eventIds.has(item.eventId));
  const registrationIds = new Set(organizationRegistrations.map((item) => item.id));
  const organizationCertificates = allCertificates.filter((item) => registrationIds.has(item.registrationId));
  const certificateIds = new Set(organizationCertificates.map((item) => item.id));
  const summary = {
    events: organizationEvents.length,
    participants: organizationRegistrations.length,
    certificates: organizationCertificates.length,
    downloads: allDownloads.filter((item) => certificateIds.has(item.certificateId)).length,
  };
  const recentEvents = organizationEvents
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);
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
