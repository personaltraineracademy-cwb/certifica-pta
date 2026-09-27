"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Loader2, LogIn } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function FirebaseSignInForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(formData: FormData) {
    setLoading(true); setError("");
    try {
      const credential = await signInWithEmailAndPassword(
        firebaseAuth,
        String(formData.get("email")),
        String(formData.get("password")),
      );
      const idToken = await credential.user.getIdToken();
      const response = await fetch("/api/auth/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null) as { error?: string } | null;
        throw new Error(body?.error ?? "Falha ao iniciar sessão");
      }
      router.replace("/dashboard");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error && error.message === "Falha ao iniciar sessão"
        ? "Não foi possível iniciar a sessão. Tente novamente."
        : "E-mail ou senha inválidos.");
    } finally { setLoading(false); }
  }
  return (
    <form action={submit} className="animate-page-enter w-[min(92vw,400px)] space-y-5 rounded-3xl border bg-card p-6 shadow-2xl shadow-brand-navy/10 sm:p-8">
      <div><h1 className="text-2xl font-semibold">Entrar</h1><p className="mt-1 text-sm text-muted-foreground">Acesse o painel Certificados PTA.</p></div>
      <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" autoComplete="email" required /></div>
      <div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button className="h-12 w-full" disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <LogIn />}
        {loading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
