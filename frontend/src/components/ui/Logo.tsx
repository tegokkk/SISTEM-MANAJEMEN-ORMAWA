import Link from "next/link";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  compact?: boolean;
}

export function Logo({ className, compact = false }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label="SIM ORMAWA & HMJ - Beranda"
      className={cn("inline-flex items-center gap-3 text-gray-950", className)}
    >
      <span className="grid size-10 place-items-center rounded-xl bg-brand-600 text-white shadow-sm">
        <Building2 aria-hidden="true" className="size-5" />
      </span>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-extrabold tracking-tight">SIM ORMAWA & HMJ</span>
          <span className="block text-[11px] font-medium text-gray-500">Politeknik Negeri Lampung</span>
        </span>
      )}
    </Link>
  );
}
