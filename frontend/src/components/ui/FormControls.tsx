"use client";

import { forwardRef, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface FieldShellProps {
  id?: string;
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function FieldShell({ id, label, error, hint, children }: FieldShellProps) {
  const descriptionId = id ? `${id}-description` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>}
      {children}
      {(error || hint) && (
        <p id={descriptionId} className={cn("text-xs", error ? "text-red-600" : "text-gray-500")}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ id, label, error, hint, className, children, ...props }, ref) => (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <select
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={(error || hint) && id ? `${id}-description` : undefined}
        className={cn(
          "h-11 w-full rounded-xl border bg-white px-3 text-sm text-gray-900 outline-none transition",
          "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:bg-gray-50",
          error ? "border-red-400" : "border-gray-200 hover:border-gray-300",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  ),
);
Select.displayName = "Select";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ id, label, error, hint, className, ...props }, ref) => (
    <FieldShell id={id} label={label} error={error} hint={hint}>
      <textarea
        ref={ref}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={(error || hint) && id ? `${id}-description` : undefined}
        className={cn(
          "min-h-24 w-full resize-y rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 outline-none transition",
          "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 disabled:bg-gray-50",
          error ? "border-red-400" : "border-gray-200 hover:border-gray-300",
          className,
        )}
        {...props}
      />
    </FieldShell>
  ),
);
Textarea.displayName = "Textarea";

type ChoiceProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const Checkbox = forwardRef<HTMLInputElement, ChoiceProps>(({ className, ...props }, ref) => (
  <input ref={ref} type="checkbox" className={cn("h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500", className)} {...props} />
));
Checkbox.displayName = "Checkbox";

export const Radio = forwardRef<HTMLInputElement, ChoiceProps>(({ className, ...props }, ref) => (
  <input ref={ref} type="radio" className={cn("h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500", className)} {...props} />
));
Radio.displayName = "Radio";
