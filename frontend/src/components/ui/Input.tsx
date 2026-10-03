"use client";

import { forwardRef, InputHTMLAttributes, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className, type, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-gray-700 select-none"
          >
            {label}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            id={id}
            type={inputType}
            aria-invalid={Boolean(error)}
            aria-describedby={(error || hint) && id ? `${id}-description` : undefined}
            className={cn(
              "w-full h-11 px-4 text-sm text-gray-900 placeholder-gray-400",
              "bg-white border rounded-xl",
              "transition-all duration-200",
              "focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500",
              "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
              error
                ? "border-red-400 focus:ring-red-400/30 focus:border-red-500"
                : "border-gray-200 hover:border-gray-300",
              leftIcon && "pl-10",
              isPassword && "pr-11",
              className
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
            {showPassword ? <EyeOff aria-hidden="true" size={16} /> : <Eye aria-hidden="true" size={16} />}
            </button>
          )}
        </div>

        {error && (
          <p id={id ? `${id}-description` : undefined} className="text-xs text-red-500 flex items-center gap-1 mt-0.5">
            <span className="inline-block w-1 h-1 rounded-full bg-red-500 flex-shrink-0" />
            {error}
          </p>
        )}
        {!error && hint && (
          <p id={id ? `${id}-description` : undefined} className="text-xs text-gray-400">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
