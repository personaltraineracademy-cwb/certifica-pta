"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  Loader2,
  LockKeyhole,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Registration = {
  id: string;
  eventName: string;
  name: string;
  existingCertificateCode: string | null;
};

type Issued = { code: string; downloadUrl: string; validationUrl: string };

export function CertificateAccessFlow({
  organizationSlug,
  eventSlug,
}: {
  organizationSlug: string;
  eventSlug: string;
}) {
  const [registration, setRegistration] = useState<Registration | null>(null);
  const [issued, setIssued] = useState<Issued | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function requestAccess(formData: FormData) {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/public/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...Object.fromEntries(formData),
          organizationSlug,
          eventSlug,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        setMessage(payload.message ?? "Não foi possível liberar o acesso.");
        return;
      }
      setRegistration(payload.registration);
      setDisplayName(payload.registration.name);
      if (payload.registration.existingCertificateCode) {
        const code = payload.registration.existingCertificateCode;
        setIssued({
          code,
          downloadUrl: `/api/public/certificates/${code}/download`,
          validationUrl: `/validar/${code}`,
        });
      }
    } catch {
      setMessage("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function issueCertificate() {
    if (!registration) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch("/api/public/certificates/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: registration.id, displayName }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setMessage(payload.error ?? "Não foi possível gerar o certificado.");
        return;
      }
      setIssued(payload);
    } catch {
      setMessage("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (issued) {
    return (
      <FlowShell step={3}>
      <Card className="animate-page-enter border-green-200 shadow-xl shadow-brand-navy/5">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 grid size-16 place-items-center rounded-full bg-green-50 text-semantic-success ring-8 ring-green-50/60">
            <CheckCircle2 className="size-8" />
          </div>
          <Badge className="mx-auto bg-semantic-success">
            Certificado disponível
          </Badge>
          <CardTitle className="mt-3 text-2xl">Tudo pronto.</CardTitle>
          <CardDescription>{registration?.eventName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild size="lg" className="h-14 w-full text-base">
            <a href={issued.downloadUrl}>
              <Download className="size-4" /> Baixar certificado em PDF
            </a>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={issued.validationUrl}>Ver validação pública</Link>
          </Button>
          <p className="pt-2 text-center font-mono text-xs text-muted-foreground">
            {issued.code}
          </p>
        </CardContent>
      </Card>
      </FlowShell>
    );
  }

  if (registration) {
    return (
      <FlowShell step={2}>
      <Card className="animate-page-enter border-brand-blue-border shadow-xl shadow-brand-navy/5">
        <CardHeader>
          <Badge variant="secondary" className="w-fit text-brand-navy">
            Participação confirmada
          </Badge>
          <CardTitle className="text-2xl">Confirme seu nome</CardTitle>
          <CardDescription>
            Ele aparecerá exatamente assim no certificado de{" "}
            {registration.eventName}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {message && (
            <Alert variant="destructive">
              <AlertTitle>Revise os dados</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="displayName">Nome completo</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={120}
              autoComplete="name"
              autoFocus
              className="h-13 text-base"
            />
          </div>
          <Alert>
            <ShieldCheck className="size-4" />
            <AlertTitle>Antes da emissão</AlertTitle>
            <AlertDescription>
              Confira acentos e sobrenomes. Correções posteriores ficam
              registradas.
            </AlertDescription>
          </Alert>
          <Button
            size="lg"
            className="h-14 w-full text-base"
            disabled={loading || displayName.trim().length < 3}
            onClick={issueCertificate}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}{" "}
            Gerar meu certificado <ArrowRight />
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setRegistration(null)}
          >
            Voltar
          </Button>
        </CardContent>
      </Card>
      </FlowShell>
    );
  }

  return (
    <FlowShell step={1}>
    <Card className="animate-page-enter border-border shadow-xl shadow-brand-navy/5">
      <CardHeader>
        <div className="mb-2 grid size-12 place-items-center rounded-2xl bg-brand-blue-soft text-brand-blue-accessible">
          <LockKeyhole className="size-6" />
        </div>
        <CardTitle className="text-2xl">Acesse seu certificado</CardTitle>
        <CardDescription>
          Informe o e-mail usado na inscrição. A consulta não expõe listas de
          participantes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={requestAccess} className="space-y-5">
          {message && (
            <Alert variant="destructive">
              <AlertTitle>Acesso não liberado</AlertTitle>
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail da inscrição</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="email"
              placeholder="voce@exemplo.com"
              className="h-13 text-base"
              required
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-14 w-full text-base"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}{" "}
            Buscar meu certificado <ArrowRight />
          </Button>
        </form>
        <div className="mt-5 flex items-start gap-2 rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-blue-accessible" />{" "}
          Apenas e-mails importados pela organização podem acessar o
          certificado.
        </div>
      </CardContent>
    </Card>
    </FlowShell>
  );
}

function FlowShell({ step, children }: { step: 1 | 2 | 3; children: ReactNode }) {
  const labels = ["Identificar", "Confirmar", "Baixar"];
  return (
    <section className="w-full" aria-label={`Etapa ${step} de 3: ${labels[step - 1]}`}>
      <div className="mb-4 grid grid-cols-3 gap-2 px-1">
        {labels.map((label, index) => {
          const number = index + 1;
          const complete = number < step;
          const active = number === step;
          return (
            <div key={label} className="min-w-0">
              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full origin-left rounded-full bg-primary transition-transform duration-500 ${number <= step ? "scale-x-100" : "scale-x-0"}`}
                />
              </div>
              <p className={`truncate text-center text-[11px] font-semibold sm:text-xs ${active ? "text-brand-blue-accessible" : complete ? "text-semantic-success" : "text-muted-foreground"}`}>
                {complete ? "✓ " : `${number}. `}{label}
              </p>
            </div>
          );
        })}
      </div>
      {children}
    </section>
  );
}
