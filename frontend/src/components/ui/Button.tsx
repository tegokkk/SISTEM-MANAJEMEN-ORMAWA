"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "accent" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary: [
    "bg-brand-600 text-white border border-brand-600",
    "hover:bg-brand-500 hover:border-brand-500",
    "shadow-[0_4px_14px_rgba(15,107,60,0.28)]",
    "hover:shadow-[0_6px_20px_rgba(15,107,60,0.36)]",
    "active:bg-brand-700",
  ].join(" "),
  accent: [
    "bg-accent-400 text-amber-950 border border-accent-400",
    "hover:bg-accent-400 hover:border-accent-400",
    "shadow-[0_4px_14px_rgba(245,166,35,0.35)]",
    "hover:shadow-[0_6px_20px_rgba(245,166,35,0.45)]",
    "active:bg-accent-600",
  ].join(" "),
  secondary: [
    "bg-white text-brand-600 border border-gray-200",
    "hover:bg-gray-50 hover:border-brand-200",
    "shadow-sm hover:shadow-md",
  ].join(" "),
  outline: [
    "bg-transparent text-brand-600 border border-brand-300",
    "hover:bg-brand-50 hover:border-brand-500",
    "shadow-sm",
  ].join(" "),
  ghost: [
    "bg-transparent text-gray-600 border border-transparent",
    "hover:bg-gray-100 hover:text-gray-900",
  ].join(" "),
  danger: [
    "bg-red-600 text-white border border-red-600",
    "hover:bg-red-500",
    "shadow-[0_4px_14px_rgba(239,68,68,0.3)]",
  ].join(" "),
};

const sizeStyles: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2.5 rounded-xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <motion.button
        ref={ref}
        whileHover={isDisabled ? {} : { scale: 1.01, y: -1 }}
        whileTap={isDisabled ? {} : { scale: 0.98, y: 0 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "inline-flex items-center justify-center font-semibold",
          "transition-all duration-200 cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          sizeStyles[size],
          variantStyles[variant],
          fullWidth && "w-full",
          className
        )}
        disabled={isDisabled}
        {...(props as HTMLMotionProps<"button">)}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={size === "sm" ? 14 : 16} />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export { Button };
