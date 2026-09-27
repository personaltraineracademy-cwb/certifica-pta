import Image from "next/image";
import { cn } from "@/lib/utils";

export function Brand({
  compact = false,
  inverse = false,
}: {
  compact?: boolean;
  inverse?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex items-center gap-3",
        inverse ? "text-white" : "text-brand-navy",
      )}
    >
      <span
        className="relative block h-9 w-8 shrink-0 overflow-hidden"
        aria-hidden="true"
      >
        <Image
          src={
            inverse ? "/brand/pta-logo-white.svg" : "/brand/pta-logo-blue.svg"
          }
          alt=""
          width={880}
          height={251}
          className="h-9 w-auto max-w-none"
        />
      </span>
      {!compact && (
        <span className="font-heading text-[1.05rem] font-bold tracking-[-0.035em]">
          Certificados PTA
        </span>
      )}
    </span>
  );
}
