"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"

import { Particles } from "@/components/ui/particles"

export function ParticlesShowcase() {
  const { theme } = useTheme()
  const [color, setColor] = useState("#ffffff")

  useEffect(() => {
    setColor(theme === "dark" ? "#ffffff" : "#000000")
  }, [theme])

  return (
    <div className="particle-showcase">
      <span className="particle-text">
        Particles
      </span>
      <Particles
        className="particle-overlay"
        quantity={100}
        ease={80}
        color={color}
        refresh
      />
    </div>
  )
}