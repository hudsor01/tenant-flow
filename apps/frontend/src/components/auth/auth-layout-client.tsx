'use client'

import { motion } from 'framer-motion'

interface AuthLayoutClientProps {
  children: React.ReactNode
  side: 'left' | 'right'
}

export function AuthLayoutClient({ children, side }: AuthLayoutClientProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}