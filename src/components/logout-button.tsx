"use client";

import { signOut } from "firebase/auth";
import { LogOut } from "lucide-react";
import { firebaseAuth } from "@/lib/firebase-client";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return <Button variant="ghost" size="icon" aria-label="Sair" onClick={async()=>{await signOut(firebaseAuth);await fetch('/api/auth/session',{method:'DELETE'});window.location.assign('/')}}><LogOut className="size-4" /></Button>;
}
