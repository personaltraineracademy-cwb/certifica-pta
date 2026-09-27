"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CheckCircle2,
  Download,
  Loader2,
  LockKeyhole,
  Search,
  ShieldCheck,
} from "lucide-react";
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
      <Card className="border-green-200 shadow-xl shadow-brand-navy/5">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 grid size-14 place-items-center rounded-full bg-green-50 text-semantic-success">
            <CheckCircle2 className="size-7" />
          </div>
          <Badge className="mx-auto bg-semantic-success">
            Certificado disponível
          </Badge>
          <CardTitle className="mt-3 text-2xl">Tudo pronto.</CardTitle>
          <CardDescription>{registration?.eventName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild size="lg" className="h-12 w-full">
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
    );
  }

  if (registration) {
    return (
      <Card className="border-brand-blue-border shadow-xl shadow-brand-navy/5">
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
            className="h-12 w-full"
            disabled={loading || displayName.trim().length < 3}
            onClick={issueCertificate}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}{" "}
            Gerar certificado
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
    );
  }

  return (
    <Card className="border-border shadow-xl shadow-brand-navy/5">
      <CardHeader>
        <div className="mb-2 grid size-10 place-items-center rounded-xl bg-brand-blue-soft text-brand-blue-accessible">
          <LockKeyhole className="size-5" />
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
              placeholder="voce@exemplo.com"
              required
            />
          </div>
          <Button
            type="submit"
            size="lg"
            className="h-12 w-full"
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Search className="size-4" />
            )}{" "}
            Consultar certificado
          </Button>
        </form>
        <div className="mt-5 flex items-start gap-2 rounded-lg bg-muted p-3 text-xs leading-5 text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand-blue-accessible" />{" "}
          Apenas e-mails importados pela organização podem acessar o
          certificado.
        </div>
      </CardContent>
    </Card>
  );
}
