import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface EarlyAccessProgressProps {
  totalSpots?: number
  baselineClaimed?: number
}

export function EarlyAccessProgress({ 
  totalSpots = 100, 
  baselineClaimed = 73 
}: EarlyAccessProgressProps) {
  const [claimedSpots, setClaimedSpots] = useState(baselineClaimed)
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Simulate real-time updates
  useEffect(() => {
    // Get stored count from localStorage
    const stored = localStorage.getItem('earlyAccessClaimed')
    if (stored) {
      setClaimedSpots(Math.min(parseInt(stored), totalSpots))
    }
    
    // Simulate occasional updates (remove in production)
    const interval = setInterval(() => {
      if (Math.random() > 0.95 && claimedSpots < totalSpots - 5) {
        setIsUpdating(true)
        setClaimedSpots(prev => {
          const newCount = Math.min(prev + 1, totalSpots)
          localStorage.setItem('earlyAccessClaimed', newCount.toString())
          return newCount
        })
        setTimeout(() => setIsUpdating(false), 600)
      }
    }, 5000)
    
    return () => clearInterval(interval)
  }, [claimedSpots, totalSpots])
  
  const percentage = (claimedSpots / totalSpots) * 100
  const spotsRemaining = totalSpots - claimedSpots
  const urgencyLevel = spotsRemaining < 10 ? 'critical' : spotsRemaining < 25 ? 'high' : 'normal'
  
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-300">
          Early Access Progress
        </span>
        <motion.span 
          className={`text-sm font-bold ${
            urgencyLevel === 'critical' ? 'text-red-400' : 
            urgencyLevel === 'high' ? 'text-yellow-400' : 
            'text-emerald-400'
          }`}
          animate={isUpdating ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.3 }}
        >
          {spotsRemaining} spots left
        </motion.span>
      </div>
      
      <div className="relative h-3 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className={`absolute inset-y-0 left-0 ${
            urgencyLevel === 'critical' ? 'bg-gradient-to-r from-red-500 to-red-400' :
            urgencyLevel === 'high' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
            'bg-gradient-to-r from-emerald-500 to-emerald-400'
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-white/20 animate-pulse" />
        </motion.div>
      </div>
      
      <div className="flex items-center justify-between mt-2">
        <motion.span 
          className="text-xs text-gray-400"
          animate={isUpdating ? { opacity: [0.5, 1, 0.5] } : {}}
        >
          {claimedSpots} founders joined
        </motion.span>
        <span className="text-xs text-gray-400">
          {totalSpots} total spots
        </span>
      </div>
      
      {urgencyLevel === 'critical' && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-xs text-center text-red-400 font-medium"
        >
          🔥 Almost full! Secure your spot now
        </motion.p>
      )}
    </div>
  )
}