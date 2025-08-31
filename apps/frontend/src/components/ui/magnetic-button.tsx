/**
 * Magnetic Button - Premium interaction component
 * Follows mouse cursor with smooth magnetic attraction
 */

"use client"

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MagneticButtonProps {
  children: React.ReactNode
  className?: string
  strength?: number
  onClick?: () => void
}

export function MagneticButton({ 
  children, 
  className, 
  strength = 0.4,
  onClick 
}: MagneticButtonProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const handleMouse = (e: React.MouseEvent) => {
    if (!ref.current) return
    
    const { clientX, clientY } = e
    const { height, width, left, top } = ref.current.getBoundingClientRect()
    const middleX = clientX - (left + width / 2)
    const middleY = clientY - (top + height / 2)
    
    setPosition({ x: middleX * strength, y: middleY * strength })
  }

  const reset = () => setPosition({ x: 0, y: 0 })

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      onClick={onClick}
      animate={position}
      transition={{
        type: "spring",
        stiffness: 200,
        damping: 15,
        mass: 0.1
      }}
      className={cn(
        "relative inline-flex items-center justify-center",
        "transition-colors duration-200",
        className
      )}
    >
      {children}
    </motion.div>
  )
}