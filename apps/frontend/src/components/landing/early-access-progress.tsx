// apps/frontend/src/components/landing/early-access-progress.tsx
'use client'

import { useEffect, useState } from 'react'
import { motion } from '@/lib/framer-motion'

interface EarlyAccessProgressProps {
  current: number
  goal: number
}

export function EarlyAccessProgress({ current, goal }: EarlyAccessProgressProps) {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setProgress((current / goal) * 100), 300)
    return () => clearTimeout(t)
  }, [current, goal])

  return (
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 0.5 }}
      className="h-2 bg-blue-600 rounded-full"
    />
  )
}
