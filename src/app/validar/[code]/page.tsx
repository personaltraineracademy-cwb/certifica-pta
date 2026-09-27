import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Ban,
  Building2,
  CalendarDays,
  Clock3,
  ExternalLink,
  FileText,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { Certificate, Event, Registration } from "@/db/schema";
import { findRecords, getRecord } from "@/lib/firestore-data";

export const metadata: Metadata = { title: "Resultado da validação" };

export default async function ValidationResultPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [certificate] = await findRecords<Certificate>("certificates", { publicCode: code.toUpperCase() });
  const registration = certificate ? await getRecord<Registration>("registrations", certificate.registrationId) : null;
  const event = registration ? await getRecord<Event>("events", registration.eventId) : null;
  const organization = event ? await getRecord<{ id: string; name: string }>("organizations", event.organizationId) : null;
  const result = certificate && registration && event && organization ? { status: certificate.status, code: certificate.publicCode, name: certificate.displayedName, issuedAt: certificate.issuedAt, eventName: event.name, startsAt: event.startsAt, endsAt: event.endsAt, workloadHours: event.workloadHours, individualWorkloadHours: registration.individualWorkloadHours, organizationName: organization.name } : null;

  const valid = result?.status === "valid";
  return (
    <main className="min-h-dvh bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-6 lg:px-8">
        <Link href="/">
          <Brand />
        </Link>
        <Link
          className="flex items-center gap-2 text-sm text-muted-foreground"
          href="/validar"
        >
          <ArrowLeft className="size-4" /> Nova consulta
        </Link>
      </div>
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-10">
        {!result ? (
          <Card className="border-amber-200">
            <CardContent className="py-12 text-center">
              <AlertTriangle className="mx-auto size-10 text-amber-600" />
              <h1 className="mt-5 text-2xl font-semibold">
                Certificado não encontrado
              </h1>
              <p className="mt-2 text-muted-foreground">
                Confira o código. Nenhuma informação adicional foi revelada.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card
            className={
              valid
                ? "overflow-hidden border-green-200"
                : "overflow-hidden border-red-200"
            }
          >
            <CardHeader className="items-center border-b py-8 text-center">
              <div
                className={`grid size-16 place-items-center rounded-full ${valid ? "bg-green-50 text-semantic-success" : "bg-red-50 text-semantic-error"}`}
              >
                {valid ? (
                  <BadgeCheck className="size-8" />
                ) : (
                  <Ban className="size-8" />
                )}
              </div>
              <Badge
                className={valid ? "bg-semantic-success" : "bg-semantic-error"}
              >
                {valid
                  ? "Certificado válido"
                  : result.status === "revoked"
                    ? "Certificado revogado"
                    : "Certificado substituído"}
              </Badge>
              <h1 className="mt-2 text-2xl font-semibold tracking-[-.04em] sm:text-3xl">
                {result.name}
              </h1>
              <p className="break-all font-mono text-xs text-muted-foreground">
                {result.code}
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {valid && (
                <section
                  className="border-b bg-muted p-4 sm:p-5"
                  aria-label="Prévia do certificado"
                >
                  <div className="rounded-xl border bg-card p-5 text-center shadow-sm sm:hidden">
                    <div className="mx-auto grid size-12 place-items-center rounded-xl bg-brand-blue-soft text-brand-blue-accessible">
                      <FileText className="size-6" />
                    </div>
                    <p className="mt-4 font-heading text-lg font-semibold text-brand-navy">
                      Certificado pronto para visualizar
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Abra o documento em tela cheia para visualizar todo o
                      certificado sem cortes.
                    </p>
                    <Button asChild className="mt-5 w-full">
                      <a
                        href={`/api/public/certificates/${result.code}/preview#view=FitH&toolbar=0&navpanes=0`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Visualizar certificado
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                  </div>
                  <iframe
                    title={`Certificado de ${result.name}`}
                    src={`/api/public/certificates/${result.code}/preview#view=FitH&toolbar=0&navpanes=0`}
                    loading="lazy"
                    className="hidden aspect-[1.414/1] w-full rounded-md border bg-card shadow-sm sm:block"
                  />
                  <Link
                    href={`/api/public/certificates/${result.code}/preview`}
                    target="_blank"
                    className="mt-3 hidden items-center justify-center gap-2 text-sm font-medium text-brand-blue-accessible hover:underline sm:flex"
                  >
                    Abrir certificado em tela cheia{" "}
                    <ExternalLink className="size-4" />
                  </Link>
                </section>
              )}
              <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-7">
                <Info
                  icon={BadgeCheck}
                  label="Evento"
                  value={result.eventName}
                />
                <Info
                  icon={Building2}
                  label="Organização emissora"
                  value={result.organizationName}
                />
                <Info
                  icon={CalendarDays}
                  label="Período"
                  value={`${result.startsAt.toLocaleDateString("pt-BR")} a ${result.endsAt.toLocaleDateString("pt-BR")}`}
                />
                <Info
                  icon={Clock3}
                  label="Carga horária"
                  value={`${result.individualWorkloadHours ?? result.workloadHours} horas`}
                />
                <Info
                  icon={CalendarDays}
                  label="Emissão"
                  value={result.issuedAt.toLocaleDateString("pt-BR")}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BadgeCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-brand-blue-accessible" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
