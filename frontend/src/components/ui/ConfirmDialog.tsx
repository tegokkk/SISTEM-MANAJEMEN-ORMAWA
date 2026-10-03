"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Lanjutkan",
  isLoading = false,
  danger = false,
  onConfirm,
  onClose,
}: {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isLoading?: boolean;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <p>{description}</p>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>Batal</Button>
        <Button type="button" variant={danger ? "danger" : "primary"} onClick={onConfirm} isLoading={isLoading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
