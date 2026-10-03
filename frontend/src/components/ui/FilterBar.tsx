import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-4 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between", className)}>{children}</div>;
}
