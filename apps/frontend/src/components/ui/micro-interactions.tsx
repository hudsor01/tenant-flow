/**
 * Micro-Interactions Component Library
 * Premium hover effects and interactive elements for modern SaaS
 */

"use client"

import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion'
import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import { INTERACTION_ANIMATIONS } from '@/lib/animations/constants'

interface HoverTiltProps {
  children: React.ReactNode
  className?: string
  tiltMaxAngleX?: number
  tiltMaxAngleY?: number
  perspective?: number
  scale?: number
  transitionEasing?: [number, number, number, number]
  transitionSpeed?: number
  glareEnable?: boolean
  glareMaxOpacity?: number
  gyroscope?: boolean
}

export function HoverTilt({
  children,
  className,
  tiltMaxAngleX = 10,
  tiltMaxAngleY = 10,
  perspective = 1000,
  scale = 1.02,
  transitionEasing = [0.03, 0.98, 0.52, 0.99],
  transitionSpeed = 400,
  glareEnable = true,
  glareMaxOpacity = 0.1,
  gyroscope = true
}: HoverTiltProps) {
  const [isHovered, setIsHovered] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  
  const mouseXSpring = useSpring(x, { stiffness: 500, damping: 100 })
  const mouseYSpring = useSpring(y, { stiffness: 500, damping: 100 })
  
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [tiltMaxAngleX, -tiltMaxAngleX])
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-tiltMaxAngleY, tiltMaxAngleY])
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    
    const rect = ref.current.getBoundingClientRect()
    const width = rect.width
    const height = rect.height
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    const xPct = mouseX / width - 0.5
    const yPct = mouseY / height - 0.5
    
    x.set(xPct)
    y.set(yPct)
  }
  
  const handleMouseEnter = () => {
    setIsHovered(true)
  }
  
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
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        perspective: perspective,
      }}
      animate={{
        scale: isHovered ? scale : 1,
      }}
      transition={{
        type: "tween",
        ease: transitionEasing,
        duration: transitionSpeed / 1000,
      }}
      className={cn("relative", className)}
    >
      {children}
      
      {glareEnable && (
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-inherit opacity-0"
          style={{
            background: `radial-gradient(600px circle at ${useTransform(mouseXSpring, [-0.5, 0.5], [0, 100])}% ${useTransform(mouseYSpring, [-0.5, 0.5], [0, 100])}%, rgba(255,255,255,${glareMaxOpacity}), transparent 40%)`,
          }}
          animate={{
            opacity: isHovered ? 1 : 0,
          }}
          transition={{
            duration: transitionSpeed / 1000,
          }}
        />
      )}
    </motion.div>
  )
}

interface FloatingElementProps {
  children: React.ReactNode
  className?: string
  amplitude?: number
  frequency?: number
  rotateAmplitude?: number
  delay?: number
}

export function FloatingElement({
  children,
  className,
  amplitude = 10,
  frequency = 2,
  rotateAmplitude = 2,
  delay = 0
}: FloatingElementProps) {
  return (
    <motion.div
      className={className}
      animate={{
        y: [-amplitude, amplitude, -amplitude],
        rotate: [-rotateAmplitude, rotateAmplitude, -rotateAmplitude],
      }}
      transition={{
        y: {
          duration: frequency,
          repeat: Infinity,
          ease: "easeInOut",
          delay,
        },
        rotate: {
          duration: frequency * 1.5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: delay + 0.5,
        },
      }}
    >
      {children}
    </motion.div>
  )
}

interface PulseGlowProps {
  children: React.ReactNode
  className?: string
  glowColor?: string
  pulseScale?: number
  pulseDuration?: number
  glowIntensity?: number
}

export function PulseGlow({
  children,
  className,
  glowColor = "rgb(59, 130, 246)",
  pulseScale = 1.05,
  pulseDuration = 2,
  glowIntensity = 0.3
}: PulseGlowProps) {
  return (
    <motion.div
      className={cn("relative", className)}
      animate={{
        scale: [1, pulseScale, 1],
        boxShadow: [
          `0 0 0 0 ${glowColor.replace('rgb', 'rgba').replace(')', `, ${glowIntensity})`)}`,
          `0 0 20px 10px ${glowColor.replace('rgb', 'rgba').replace(')', ', 0)')}`,
          `0 0 0 0 ${glowColor.replace('rgb', 'rgba').replace(')', ', 0)')}`
        ],
      }}
      transition={{
        duration: pulseDuration,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  )
}

interface MorphingButtonProps {
  children: React.ReactNode
  className?: string
  hoverContent?: React.ReactNode
  morphDuration?: number
}

export function MorphingButton({
  children,
  className,
  hoverContent,
  morphDuration = 0.3
}: MorphingButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <motion.button
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...INTERACTION_ANIMATIONS.TAP_SCALE}
    >
      <motion.div
        animate={{
          y: isHovered ? -30 : 0,
          opacity: isHovered ? 0 : 1,
        }}
        transition={{ duration: morphDuration }}
      >
        {children}
      </motion.div>
      
      {hoverContent && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            y: isHovered ? 0 : 30,
            opacity: isHovered ? 1 : 0,
          }}
          transition={{ duration: morphDuration }}
        >
          {hoverContent}
        </motion.div>
      )}
    </motion.button>
  )
}

interface ElasticScaleProps {
  children: React.ReactNode
  className?: string
  scaleOnHover?: number
  scaleOnTap?: number
  elasticDuration?: number
}

export function ElasticScale({
  children,
  className,
  scaleOnHover = 1.05,
  scaleOnTap = 0.95,
  elasticDuration = 0.2
}: ElasticScaleProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ 
        scale: scaleOnHover,
        transition: { 
          type: "spring", 
          stiffness: 300, 
          damping: 10 
        }
      }}
      whileTap={{ 
        scale: scaleOnTap,
        transition: { 
          type: "spring", 
          stiffness: 400, 
          damping: 17 
        }
      }}
    >
      {children}
    </motion.div>
  )
}

// Preset configurations
export const MicroInteractionPresets = {
  cardHover: {
    tiltMaxAngleX: 5,
    tiltMaxAngleY: 8,
    scale: 1.02,
    transitionSpeed: 300,
    glareEnable: true,
  },
  
  buttonHover: {
    tiltMaxAngleX: 8,
    tiltMaxAngleY: 12,
    scale: 1.05,
    transitionSpeed: 200,
    glareEnable: false,
  },
  
  gentleFloat: {
    amplitude: 5,
    frequency: 3,
    rotateAmplitude: 1,
  },
  
  strongFloat: {
    amplitude: 15,
    frequency: 2,
    rotateAmplitude: 3,
  },
  
  subtlePulse: {
    pulseScale: 1.02,
    pulseDuration: 3,
    glowIntensity: 0.1,
  },
  
  strongPulse: {
    pulseScale: 1.08,
    pulseDuration: 1.5,
    glowIntensity: 0.4,
  }
}