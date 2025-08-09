'use client'

/**
 * Form Loading Overlay - Client Component
 * 
 * Focused client component for loading state animation
 * Minimal JavaScript footprint for this interactive feature
 */

import { motion } from '@/lib/framer-motion'
import { Spinner } from '@/components/ui/spinner'

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
          <Spinner size="md" />
          <span>Saving...</span>
        </div>
      </div>
    </motion.div>
  )
}