import Link from "next/link";
import { Brand } from "@/components/brand";
import { FirebaseSignInForm } from "@/components/firebase-sign-in-form";

export default function SignInPage() {
  return (
    <main className="certificate-grid grid min-h-dvh place-items-center bg-background px-5 py-10">
      <div className="flex flex-col items-center gap-7">
        <Link href="/">
          <Brand />
        </Link>
        <FirebaseSignInForm />
      </div>
    </main>
  );
}
