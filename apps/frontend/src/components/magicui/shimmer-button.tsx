"use client"

import React from "react"
import { cn } from "./utils"

export interface ShimmerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  shimmerColor?: string
  shimmerSize?: string
  borderRadius?: string
  shimmerDuration?: string
  background?: string
  className?: string
  children?: React.ReactNode
}

export const ShimmerButton = React.forwardRef<
  HTMLButtonElement,
  ShimmerButtonProps
>(
  (
    {
      shimmerColor = "#ffffff",
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "100px",
      background = "rgba(0, 0, 0, 1)",
      className,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        style={
          {
            "--spread": "90deg",
            "--shimmer-color": shimmerColor,
            "--radius": borderRadius,
            "--speed": shimmerDuration,
            "--cut": shimmerSize,
            "--bg": background,
          } as React.CSSProperties
        }
        className={cn(
          "group relative cursor-pointer overflow-hidden whitespace-nowrap px-6 py-4 text-white [background:var(--bg)] [border-radius:var(--radius)]",
          "transition-all duration-300 hover:scale-105 active:scale-95",
          className,
        )}
        {...props}
      >
        {/* spark container */}
        <div
          className={cn(
            "absolute inset-0 overflow-visible [container-type:size]",
          )}
        >
          {/* spark */}
          <div className="absolute inset-0 h-full w-full animate-[shimmer_var(--speed)_linear_infinite] [background:conic-gradient(from_0deg,transparent_0_0,var(--shimmer-color)_var(--spread),transparent_var(--spread))] [inset:calc(var(--cut)*-1)] [mask:linear-gradient(white_0_0)_content-box,linear-gradient(white_0_0)]">
            {/* spark before */}
            <div className="absolute inset-0 w-auto [background:linear-gradient(var(--shimmer-color),var(--shimmer-color))_no-repeat] [border-radius:var(--radius)] [inset:calc(var(--cut)*-1)]" />
          </div>
        </div>
        <span className="relative z-10 flex items-center justify-center">
          {children}
        </span>
      </button>
    )
  },
)

ShimmerButton.displayName = "ShimmerButton"