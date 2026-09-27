"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ValidationLookup() {
  const router = useRouter();
  const [code, setCode] = useState("");
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        const normalized = code.trim().toUpperCase();
        if (normalized)
          router.push(`/validar/${encodeURIComponent(normalized)}`);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="code">Código do certificado</Label>
        <Input
          id="code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="CERT-XXXXXXXX-XXXXXXXX-XXXXXXXX"
          className="font-mono"
          required
        />
      </div>
      <Button type="submit" className="w-full">
        <Search className="size-4" /> Verificar autenticidade
      </Button>
    </form>
  );
}
