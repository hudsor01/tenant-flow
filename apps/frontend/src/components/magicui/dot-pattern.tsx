"use client";

import { useId } from "react";
import { 
  cn, 
  ANIMATION_DURATIONS 
} from "@/lib/design-system";
import type { ComponentProps } from "@repo/shared";

interface DotPatternProps extends React.SVGProps<SVGSVGElement> {
  cx?: number | string;
  cy?: number | string;
  cr?: number | string;
  variant?: 'default' | 'subtle' | 'bold' | 'primary' | 'accent';
  animated?: boolean;
  opacity?: number;
  density?: 'sparse' | 'normal' | 'dense';
}

export function DotPattern({
  width = 16,
  height = 16,
  x = 0,
  y = 0,
  cx = 1,
  cy = 1,
  cr = 1,
  className,
  variant = 'default',
  animated = false,
  opacity = 0.8,
  density = 'normal',
  ...props
}: DotPatternProps) {
  const id = useId();

  // Style variants for different visual approaches
  const variantStyles = {
    default: "fill-neutral-400/80",
    subtle: "fill-gray-300/50",
    bold: "fill-gray-600/90",
    primary: "fill-primary/60",
    accent: "fill-accent/70"
  };

  // Density configurations
  const numWidth = typeof width === 'number' ? width : parseFloat(width.toString());
  const numHeight = typeof height === 'number' ? height : parseFloat(height.toString());
  
  const densityConfig = {
    sparse: { width: numWidth * 1.5, height: numHeight * 1.5 },
    normal: { width: numWidth, height: numHeight },
    dense: { width: numWidth * 0.75, height: numHeight * 0.75 }
  };

  const selectedStyle = variantStyles[variant];
  const { width: finalWidth, height: finalHeight } = densityConfig[density];
  const finalOpacity = Math.max(0, Math.min(1, opacity));

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full transition-opacity duration-500 ease-out",
        selectedStyle,
        animated && "animate-pulse",
        className,
      )}
      style={{
        opacity: finalOpacity,
        animationDuration: animated ? `${ANIMATION_DURATIONS.slow}ms` : undefined,
      }}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={finalWidth}
          height={finalHeight}
          patternUnits="userSpaceOnUse"
          patternContentUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <circle 
            id="pattern-circle" 
            cx={cx} 
            cy={cy} 
            r={cr}
            className={cn(
              "transition-all duration-300 ease-out",
              animated && "animate-pulse"
            )}
            style={{
              animationDelay: animated ? `${Math.random() * 2000}ms` : undefined,
              animationDuration: animated ? `${ANIMATION_DURATIONS.default}ms` : undefined,
            }}
          />
        </pattern>
      </defs>
      <rect 
        width="100%" 
        height="100%" 
        strokeWidth={0} 
        fill={`url(#${id})`}
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}