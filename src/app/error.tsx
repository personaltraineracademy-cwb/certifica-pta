"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="certificate-grid grid min-h-dvh place-items-center bg-background px-5">
      <div className="max-w-md text-center">
        <AlertTriangle className="mx-auto size-10 text-semantic-warning" />
        <h1 className="mt-5 text-2xl font-bold text-brand-navy">
          Algo não saiu como esperado
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tente novamente. Se persistir, procure o suporte do evento.
        </p>
        <Button className="mt-6" onClick={reset}>
          Tentar novamente
        </Button>
      </div>
    </main>
  );
}
