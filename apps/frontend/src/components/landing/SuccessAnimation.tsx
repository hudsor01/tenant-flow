import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Sparkles } from 'lucide-react'
import { useEffect } from 'react'

interface SuccessAnimationProps {
  show: boolean
  onComplete?: () => void
}

export function SuccessAnimation({ show, onComplete }: SuccessAnimationProps) {
  useEffect(() => {
    if (show && onComplete) {
      const timer = setTimeout(onComplete, 3000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative"
          >
            {/* Success circle */}
            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="w-32 h-32 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 flex items-center justify-center"
              >
                <CheckCircle className="w-16 h-16 text-white" />
              </motion.div>
              
              {/* Sparkles */}
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0, rotate: 0 }}
                  animate={{ 
                    scale: [0, 1, 0],
                    rotate: 360,
                    x: [0, (i % 2 ? 50 : -50) * Math.cos(i * 60 * Math.PI / 180)],
                    y: [0, (i % 2 ? 50 : -50) * Math.sin(i * 60 * Math.PI / 180)]
                  }}
                  transition={{ 
                    duration: 1,
                    delay: 0.3 + i * 0.1,
                    ease: "easeOut"
                  }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <Sparkles className="w-6 h-6 text-yellow-400" />
                </motion.div>
              ))}
            </div>
            
            {/* Success message */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-center"
            >
              <h3 className="text-2xl font-bold text-white mb-2">
                Welcome to TenantFlow! 🎉
              </h3>
              <p className="text-gray-300">
                Check your email to confirm your spot
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}