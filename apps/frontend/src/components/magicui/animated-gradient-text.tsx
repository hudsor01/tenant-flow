"use client"

import { cn } from "./utils"
import type { ReactNode } from "react"

export interface AnimatedGradientTextProps {
  children: ReactNode
  className?: string
}

export function AnimatedGradientText({
  children,
  className,
}: AnimatedGradientTextProps) {
  return (
    <div
      className={cn(
        "group relative flex max-w-fit flex-row items-center justify-center rounded-2xl bg-white/40 backdrop-blur-sm px-4 py-1.5 text-sm font-medium shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] transition-all ease-out hover:shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)] dark:bg-black/40",
        className,
      )}
    >
      <span
        className={cn(
          "animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent",
        )}
        style={{
          "--bg-size": "200%",
        } as React.CSSProperties}
      >
        {children}
      </span>
    </div>
  )
}