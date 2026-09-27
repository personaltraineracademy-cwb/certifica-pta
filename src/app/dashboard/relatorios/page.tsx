import { desc, eq, sql } from "drizzle-orm";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getDb } from "@/db";
import { events, registrations } from "@/db/schema";
import { requireOrganization } from "@/lib/auth";

export default async function ReportsPage() {
  const { organization } = await requireOrganization();
  const rows = await getDb()
    .select({
      id: events.id,
      name: events.name,
      startsAt: events.startsAt,
      participants: sql<number>`count(${registrations.id})::int`,
    })
    .from(events)
    .leftJoin(registrations, eq(registrations.eventId, events.id))
    .where(eq(events.organizationId, organization.id))
    .groupBy(events.id)
    .orderBy(desc(events.createdAt));
  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold text-brand-blue-accessible">
          Exportação
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-.04em] text-brand-navy">
          Relatórios
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Baixe participantes e emissões em CSV.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Relatórios por evento</CardTitle>
          <CardDescription>
            Arquivos UTF-8 prontos para Excel e Google Sheets.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {rows.length ? (
            rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium">{row.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.startsAt.toLocaleDateString("pt-BR")} ·{" "}
                    {row.participants} participantes
                  </p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/admin/events/${row.id}/report`}>
                    <Download className="size-4" /> CSV
                  </a>
                </Button>
              </div>
            ))
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Nenhum evento disponível.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
