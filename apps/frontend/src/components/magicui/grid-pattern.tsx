import { useId } from "react";

import { 
  cn, 
  ANIMATION_DURATIONS 
} from "@/lib/design-system";

interface GridPatternProps extends React.SVGProps<SVGSVGElement> {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  squares?: Array<[x: number, y: number]>;
  strokeDasharray?: string;
  className?: string;
  variant?: 'default' | 'subtle' | 'bold' | 'primary' | 'accent';
  animated?: boolean;
  opacity?: number;
  [key: string]: unknown;
}

export function GridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = "0",
  squares,
  className,
  variant = 'default',
  animated = false,
  opacity = 0.3,
  ...props
}: GridPatternProps) {
  const id = useId();

  // Style variants for different visual approaches
  const variantStyles = {
    default: "fill-[color-mix(in oklab,var(--color-label-primary) 25%, transparent)] stroke-[color-mix(in oklab,var(--color-label-primary) 25%, transparent)]",
    subtle: "fill-[color-mix(in oklab,var(--color-label-primary) 15%, transparent)] stroke-[color-mix(in oklab,var(--color-label-primary) 15%, transparent)]",
    bold: "fill-[color-mix(in oklab,var(--color-label-primary) 45%, transparent)] stroke-[color-mix(in oklab,var(--color-label-primary) 45%, transparent)]",
    primary: "fill-[color-mix(in oklab,var(--primary) 35%, transparent)] stroke-[color-mix(in oklab,var(--primary) 40%, transparent)]",
    accent: "fill-[color-mix(in oklab,var(--accent) 35%, transparent)] stroke-[color-mix(in oklab,var(--accent) 40%, transparent)]"
  };

  const selectedStyle = variantStyles[variant];
  const finalOpacity = Math.max(0, Math.min(1, opacity));

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
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
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
            className="transition-all duration-300 ease-out"
          />
        </pattern>
      </defs>
      <rect 
        width="100%" 
        height="100%" 
        strokeWidth={0} 
        fill={`url(#${id})`}
        className="transition-opacity duration-500 ease-out"
      />
      {squares && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([x, y]) => (
            <rect
              strokeWidth="0"
              key={`${x}-${y}`}
              width={width - 1}
              height={height - 1}
              x={x * width + 1}
              y={y * height + 1}
              className={cn(
                "transition-all ease-out",
                animated && "animate-pulse"
              )}
              style={{
                animationDelay: animated ? `${(x + y) * 100}ms` : undefined,
                animationDuration: animated ? `${ANIMATION_DURATIONS.default}ms` : undefined,
              }}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}
