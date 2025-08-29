"use client"

import { cn } from "./utils"

interface BorderBeamProps {
  className?: string
  size?: number
  duration?: number
  borderWidth?: number
  anchor?: number
  colorFrom?: string
  colorTo?: string
  delay?: number
}

export function BorderBeam({
  className,
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  delay = 0,
}: BorderBeamProps) {
  return (
    <div
      style={
        {
          "--size": size,
          "--duration": duration,
          "--anchor": anchor,
          "--border-width": borderWidth,
          "--color-from": colorFrom,
          "--color-to": colorTo,
          "--delay": `-${delay}s`,
        } as React.CSSProperties
      }
      className={cn(
        "absolute inset-0 rounded-[inherit] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black,transparent)]",
        className,
      )}
    >
      <div
        className="absolute inset-0 rounded-[inherit] animate-[border-beam_var(--duration)s_infinite_linear] opacity-50"
        style={{
          background: `conic-gradient(from var(--anchor)deg, transparent, var(--color-from), var(--color-to) calc(var(--size) * 1%), transparent calc(var(--size) * 2%))`,
          width: `calc(100% + var(--border-width) * 2px)`,
          height: `calc(100% + var(--border-width) * 2px)`,
          left: `calc(var(--border-width) * -1px)`,
          top: `calc(var(--border-width) * -1px)`,
          animationDelay: "var(--delay)",
        }}
      />
    </div>
  )
}