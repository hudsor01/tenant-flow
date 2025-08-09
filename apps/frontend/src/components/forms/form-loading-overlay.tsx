'use client'

/**
 * Form Loading Overlay - Client Component
 * 
 * Focused client component for loading state animation
 * Minimal JavaScript footprint for this interactive feature
 */

import { motion } from '@/lib/framer-motion'

export function FormLoadingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50"
    >
      <div className="bg-card p-6 rounded-lg shadow-lg">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
          <span>Saving...</span>
        </div>
      </div>
    </motion.div>
  )
}