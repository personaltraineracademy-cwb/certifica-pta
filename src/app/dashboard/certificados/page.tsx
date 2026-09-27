import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Certificate, Event, Registration } from "@/db/schema";
import { requireOrganization } from "@/lib/auth";
import { findRecords, listRecords } from "@/lib/firestore-data";

export default async function CertificatesPage() {
  const { organization } = await requireOrganization();
  const [events, registrations, certificates] = await Promise.all([
    findRecords<Event>("events", { organizationId: organization.id }),
    listRecords<Registration>("registrations"),
    listRecords<Certificate>("certificates"),
  ]);
  const eventById = new Map(events.map((event) => [event.id, event]));
  const registrationById = new Map(registrations.filter((item) => eventById.has(item.eventId)).map((item) => [item.id, item]));
  const rows = certificates
    .filter((item) => registrationById.has(item.registrationId))
    .sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime())
    .slice(0, 100)
    .map((item) => ({ id: item.id, code: item.publicCode, name: item.displayedName, status: item.status, issuedAt: item.issuedAt, eventName: eventById.get(registrationById.get(item.registrationId)!.eventId)!.name }));
  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-semibold text-brand-blue-accessible">
          Emissões
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-.04em] text-brand-navy">
          Certificados
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Histórico recente com validação pública.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{rows.length} emissões recentes</CardTitle>
          <CardDescription>
            Revogações são feitas dentro do evento correspondente.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Participante</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6">Emissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="pl-6 font-medium">
                      {row.name}
                    </TableCell>
                    <TableCell>{row.eventName}</TableCell>
                    <TableCell>
                      <Link
                        href={`/validar/${row.code}`}
                        className="font-mono text-xs text-brand-blue-accessible hover:underline"
                      >
                        {row.code}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.status === "valid" ? "default" : "destructive"
                        }
                        className={
                          row.status === "valid" ? "bg-semantic-success" : ""
                        }
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="pr-6 text-muted-foreground">
                      {row.issuedAt.toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="h-28 text-center text-muted-foreground"
                  >
                    Nenhum certificado emitido.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
