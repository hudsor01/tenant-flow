"use client"

import { cn } from "./utils"
import React from "react"

interface MeteorsProps {
  number?: number
  className?: string
}

export const Meteors: React.FC<MeteorsProps> = ({
  number = 20,
  className,
}) => {
  const meteors = new Array(number).fill(true)

  return (
    <>
      {meteors.map((_, idx) => (
        <span
          key={idx}
          className={cn(
            "absolute left-1/2 top-1/2 h-0.5 w-0.5 rotate-[215deg] animate-[meteor_3s_linear_infinite] rounded-[9999px] bg-slate-5 shadow-[0_0_0_1px_#ffffff10]",
            "before:absolute before:top-1/2 before:h-[1px] before:w-[50px] before:-translate-y-1/2 before:transform before:bg-gradient-to-r before:from-[#64748b] before:to-transparent before:content-['']",
            className,
          )}
          style={{
            top: Math.floor(Math.random() * 100) + "%",
            left: Math.floor(Math.random() * 100) + "%",
            animationDelay: Math.random() * 1 + "s",
            animationDuration: Math.floor(Math.random() * 8 + 2) + "s",
          }}
        />
      ))}
    </>
  )
}