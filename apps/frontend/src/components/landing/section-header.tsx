/**
 * DRY Section Header - Consolidates repeated landing page header pattern
 * Used across features, testimonials, pricing sections
 */

"use client";

import { BlurFade } from '@/components/magicui'
import { motion } from 'framer-motion'
import { EASING_CURVES } from '@/lib/animations/constants'

interface SectionHeaderProps {
  badge?: string
  title: string
  gradient?: string
  description: string
  delay?: number
}

export function SectionHeader({ 
  badge, 
  title, 
  gradient, 
  description, 
  delay = 0 
}: SectionHeaderProps) {
  return (
    <div className="mx-auto max-w-3xl text-center mb-20">
      <BlurFade delay={delay}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASING_CURVES.GENTLE }}
        >
          {badge && (
            <span className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-muted/50 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-foreground/80 mb-6">
              {badge}
            </span>
          )}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-[-0.02em] leading-[1.1] mb-6">
            {title}
            {gradient && (
              <span className="block mt-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {gradient}
              </span>
            )}
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground/90 leading-relaxed max-w-2xl mx-auto">
            {description}
          </p>
        </motion.div>
      </BlurFade>
    </div>
  )
}