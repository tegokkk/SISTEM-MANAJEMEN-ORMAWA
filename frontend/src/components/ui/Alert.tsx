"use client";

import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type AlertVariant = "success" | "error" | "warning" | "info";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  title?: string;
  onDismiss?: () => void;
}

const variantConfig: Record<AlertVariant, { icon: React.ElementType; styles: string }> = {
  success: { icon: CheckCircle, styles: "bg-emerald-50 border-emerald-200 text-emerald-800" },
  error:   { icon: XCircle,     styles: "bg-red-50 border-red-200 text-red-800" },
  warning: { icon: AlertTriangle, styles: "bg-amber-50 border-amber-200 text-amber-800" },
  info:    { icon: Info,         styles: "bg-blue-50 border-blue-200 text-blue-800" },
};

function Alert({ variant = "info", title, onDismiss, className, children }: AlertProps) {
  const { icon: Icon, styles } = variantConfig[variant];
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        transition={{ duration: 0.2 }}
        className={cn(
          "flex gap-3 p-4 rounded-xl border text-sm",
          styles,
          className
        )}
        role="alert"
      >
        <Icon size={16} className="flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          {title && <p className="font-semibold mb-0.5">{title}</p>}
          <div className="leading-relaxed">{children}</div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
            aria-label="Tutup notifikasi"
          >
            <X size={14} />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export { Alert };
