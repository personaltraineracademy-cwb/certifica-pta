import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <main className="certificate-grid grid min-h-dvh place-items-center bg-background px-5">
      <div className="text-center">
        <SearchX className="mx-auto size-10 text-brand-blue-accessible" />
        <h1 className="mt-5 text-2xl font-bold text-brand-navy">
          Página não encontrada
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          O endereço pode estar incorreto ou ter expirado.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Voltar ao início</Link>
        </Button>
      </div>
    </main>
  );
}
