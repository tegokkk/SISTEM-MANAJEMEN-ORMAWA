"use client";

import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  elevated?: boolean;
  noPadding?: boolean;
}

function Card({ className, glass, elevated, noPadding, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border transition-shadow duration-200",
        !noPadding && "p-6",
        glass
          ? "bg-white/70 backdrop-blur-xl border-white/60"
          : "bg-white border-gray-100",
        elevated
          ? "shadow-[0_10px_40px_rgba(0,0,0,0.1)]"
          : "shadow-sm hover:shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      {children}
    </div>
  );
}

function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-xl font-bold text-gray-900 font-heading", className)}
      {...props}
    >
      {children}
    </h2>
  );
}

function CardDescription({ className, children, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-gray-500 leading-relaxed", className)} {...props}>
      {children}
    </p>
  );
}

function CardContent({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("mt-4", className)} {...props}>
      {children}
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardContent };
