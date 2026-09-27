"use client";

import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Sair"
      onClick={async () => {
        await signOut(firebaseAuth);
        await fetch("/api/auth/session", { method: "DELETE" });
        router.replace("/");
        router.refresh();
      }}
    >
      <LogOut className="size-4" />
    </Button>
  );
}
