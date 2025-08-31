"use client"

import { cn } from "./utils"
import React, { useMemo } from "react"

interface MeteorsProps {
  number?: number
  className?: string
}

// Seeded random number generator for consistent values between server and client
function seededRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

export const Meteors: React.FC<MeteorsProps> = ({
  number = 20,
  className,
}) => {
  // Generate consistent random values to avoid hydration mismatch
  const meteorData = useMemo(() => {
    // Use a stable seed based on the number prop
    const random = seededRandom(number * 1337)
    
    return Array.from({ length: number }, (_, idx) => ({
      id: idx,
      top: Math.floor(random() * 100),
      left: Math.floor(random() * 100),
      animationDelay: random() * 1,
      animationDuration: Math.floor(random() * 8 + 2),
    }))
  }, [number])

  return (
    <>
      {meteorData.map((meteor) => (
        <span
          key={meteor.id}
          className={cn(
            "absolute left-1/2 top-1/2 h-0.5 w-0.5 rotate-[215deg] animate-[meteor_3s_linear_infinite] rounded-[9999px] bg-slate-5 shadow-[0_0_0_1px_#ffffff10]",
            "before:absolute before:top-1/2 before:h-[1px] before:w-[50px] before:-translate-y-1/2 before:transform before:bg-gradient-to-r before:from-[#64748b] before:to-transparent before:content-['']",
            className,
          )}
          style={{
            top: meteor.top + "%",
            left: meteor.left + "%",
            animationDelay: meteor.animationDelay + "s",
            animationDuration: meteor.animationDuration + "s",
          }}
        />
      ))}
    </>
  )
}