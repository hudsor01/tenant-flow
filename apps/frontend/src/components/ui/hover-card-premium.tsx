/**
 * Premium Hover Card Component - Advanced hover interactions
 * Inspired by Linear's hover cards and Stripe's interactive elements
 */

'use client'

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"

interface HoverCardPremiumProps {
  children: React.ReactNode
  className?: string
  glowColor?: string
  tiltAmount?: number
  scaleAmount?: number
}

export function HoverCardPremium({
  children,
  className,
  glowColor = "rgba(59, 130, 246, 0.5)",
  tiltAmount = 10,
  scaleAmount = 1.05
}: HoverCardPremiumProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  const mouseXSpring = useSpring(x, { stiffness: 500, damping: 50 })
  const mouseYSpring = useSpring(y, { stiffness: 500, damping: 50 })
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [`${tiltAmount}deg`, `-${tiltAmount}deg`])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [`-${tiltAmount}deg`, `${tiltAmount}deg`])
  
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    
    const rect = ref.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = event.clientX - rect.left
    const mouseY = event.clientY - rect.top
    
    const xPercent = (mouseX / width) - 0.5
    const yPercent = (mouseY / height) - 0.5
    
    x.set(xPercent)
    y.set(yPercent)
  }
  
  const handleMouseLeave = () => {
    x.set(0)
    y.set(0)
  }
  
  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d"
      }}
      whileHover={{ scale: scaleAmount }}
      transition={{ scale: { type: "spring", stiffness: 400, damping: 30 } }}
      className={cn(
        "relative rounded-xl border border-border/50 bg-card p-6 shadow-lg transition-shadow hover:shadow-xl",
        className
      )}
    >
      {/* Glow effect */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition-opacity hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mouseXSpring.get() * 100 + 50}% ${mouseYSpring.get() * 100 + 50}%, ${glowColor}, transparent 40%)`
        }}
      />
      
      {/* Content */}
      <div className="relative z-10" style={{ transform: "translateZ(50px)" }}>
        {children}
      </div>
    </motion.div>
  )
}

/**
 * Magnetic Hover - Elements that follow the cursor
 */
interface MagneticHoverProps {
  children: React.ReactNode
  className?: string
  strength?: number
}

export function MagneticHover({
  children,
  className,
  strength = 0.5
}: MagneticHoverProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = React.useState(false)
  
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  const xSpring = useSpring(x, { stiffness: 150, damping: 15 })
  const ySpring = useSpring(y, { stiffness: 150, damping: 15 })
  
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current || !isHovered) return
    
    const rect = ref.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    const distanceX = (event.clientX - centerX) * strength
    const distanceY = (event.clientY - centerY) * strength
    
    x.set(distanceX)
    y.set(distanceY)
  }
  
  const handleMouseEnter = () => setIsHovered(true)
  
  const handleMouseLeave = () => {
    setIsHovered(false)
    x.set(0)
    y.set(0)
  }
  
  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        x: xSpring,
        y: ySpring
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

/**
 * Spotlight Hover - Creates a spotlight effect that follows the cursor
 */
interface SpotlightHoverProps {
  children: React.ReactNode
  className?: string
  spotlightColor?: string
  spotlightSize?: number
}

export function SpotlightHover({
  children,
  className,
  spotlightColor = "rgba(255, 255, 255, 0.1)",
  spotlightSize = 400
}: SpotlightHoverProps) {
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 })
  const [isHovered, setIsHovered] = React.useState(false)
  
  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setMousePosition({
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    })
  }
  
  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Spotlight */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300"
        style={{
          background: `radial-gradient(${spotlightSize}px circle at ${mousePosition.x}px ${mousePosition.y}px, ${spotlightColor}, transparent 40%)`,
          opacity: isHovered ? 1 : 0
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

/**
 * Ripple Hover - Creates a ripple effect on hover
 */
export function RippleHover({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([])
  
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const id = Date.now()
    
    setRipples(prev => [...prev, { x, y, id }])
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== id))
    }, 1000)
  }
  
  return (
    <div
      onClick={handleClick}
      className={cn("relative overflow-hidden", className)}
    >
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="absolute rounded-full bg-primary/20"
          style={{
            left: ripple.x,
            top: ripple.y,
            transform: "translate(-50%, -50%)"
          }}
          initial={{ width: 0, height: 0, opacity: 1 }}
          animate={{ width: 300, height: 300, opacity: 0 }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      ))}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}