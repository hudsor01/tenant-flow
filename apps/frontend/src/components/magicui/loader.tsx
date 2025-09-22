"use client";

import { cn } from "@/lib/design-system";
import { cva, type VariantProps } from "class-variance-authority";

const loaderVariants = cva("", {
  variants: {
    variant: {
      circular: "inline-block animate-spin rounded-full border-2 border-solid border-current border-r-transparent",
      dots: "flex gap-1",
      pulse: "rounded-full bg-current animate-pulse",
      bars: "flex gap-1",
      text: "animate-pulse",
    },
    size: {
      sm: "",
      md: "",
      lg: "",
    },
  },
  compoundVariants: [
    {
      variant: "circular",
      size: "sm",
      className: "h-4 w-4 border-2",
    },
    {
      variant: "circular",
      size: "md",
      className: "h-6 w-6 border-2",
    },
    {
      variant: "circular",
      size: "lg",
      className: "h-8 w-8 border-[3px]",
    },
    {
      variant: "pulse",
      size: "sm",
      className: "h-2 w-2",
    },
    {
      variant: "pulse",
      size: "md",
      className: "h-3 w-3",
    },
    {
      variant: "pulse",
      size: "lg",
      className: "h-4 w-4",
    },
  ],
  defaultVariants: {
    variant: "circular",
    size: "md",
  },
});

export interface LoaderProps extends VariantProps<typeof loaderVariants> {
  className?: string;
  text?: string;
}

export function Loader({ variant, size, className, text }: LoaderProps) {
  if (variant === "dots") {
    return (
      <div data-tokens="applied" className={cn("flex gap-1", className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            data-tokens="applied" className={cn(
              "rounded-full bg-current animate-pulse",
              size === "sm" && "h-1.5 w-1.5",
              size === "md" && "h-2 w-2",
              size === "lg" && "h-3 w-3"
            )}
            style={{
              animationDelay: `${i * 150}ms`,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "bars") {
    return (
      <div data-tokens="applied" className={cn("flex gap-1", className)}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            data-tokens="applied" className={cn(
              "bg-current animate-pulse rounded-[var(--radius-small)]",
              size === "sm" && "h-3 w-0.5",
              size === "md" && "h-4 w-1",
              size === "lg" && "h-6 w-1.5"
            )}
            style={{
              animationDelay: `${i * 100}ms`,
              animationDuration: "1s",
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "text" && text) {
    return (
      <span data-tokens="applied" className={cn("animate-pulse", className)}>
        {text}
      </span>
    );
  }

  if (variant === "pulse") {
    return (
      <div data-tokens="applied" className={cn(loaderVariants({ variant, size }), className)} />
    );
  }

  // Default circular loader
  return (
    <div
      data-tokens="applied" className={cn(loaderVariants({ variant: "circular", size }), className)}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}