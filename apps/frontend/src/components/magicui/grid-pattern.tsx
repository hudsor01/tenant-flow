"use client"

import { cn } from "./utils"
import { useMemo, useId } from "react"

interface GridPatternProps {
  width?: number
  height?: number
  x?: number
  y?: number
  strokeDasharray?: number
  numSquares?: number
  className?: string
  _maxOpacity?: number
  duration?: number
  repeatDelay?: number
  seed?: number
}

// Seeded random number generator for consistent values
function seededRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

export function GridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  _maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 0.5,
  seed = 12345,
  ...props
}: GridPatternProps) {
  const id = useId()
  
  // Generate consistent random values using seed to avoid hydration mismatch
  const squares = useMemo(() => {
    const random = seededRandom(seed)
    return Array.from({ length: numSquares }, (_, i) => ({
      id: i,
      x: Math.floor(random() * (100 / width)) * width,
      y: Math.floor(random() * (100 / height)) * height,
      delay: random() * duration,
    }))
  }, [numSquares, width, height, duration, seed])

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full fill-gray-4/30 stroke-gray-4/30",
        className,
      )}
      {...props}
    >
      <defs>
        <pattern
          id={`${id}`}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5,${height} V.5 H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      {squares.map((sq) => (
        <rect
          key={sq.id}
          width={width - 1}
          height={height - 1}
          x={sq.x}
          y={sq.y}
          fill="currentColor"
          className="animate-[grid-pattern-fade_var(--duration)s_ease-in-out_infinite] stroke-gray-6/10 fill-gray-6/10"
          style={{
            "--duration": `${duration + repeatDelay}`,
            animationDelay: `${sq.delay}s`,
          } as React.CSSProperties}
        />
      ))}
    </svg>
  )
}