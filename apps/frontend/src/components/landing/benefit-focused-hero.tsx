import { motion } from 'framer-motion'
import { ArrowRight, Clock, TrendingUp, Users } from 'lucide-react'

const keyBenefits = [
  {
    icon: Clock,
    text: "Save 10+ hours per week"
  },
  {
    icon: TrendingUp,
    text: "Reduce late payments by 73%"
  },
  {
    icon: Users,
    text: "Manage 5x more properties"
  }
]

interface BenefitFocusedHeroProps {
  onCtaClick: () => void
}

export function BenefitFocusedHero({ onCtaClick }: BenefitFocusedHeroProps) {
  return (
    <div className="text-center max-w-4xl mx-auto">
      {/* Pre-headline */}
      <motion.p
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-6"
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Launching January 2025 - Join Early Access
      </motion.p>

      {/* Main headline with benefit focus */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6"
      >
        <span className="block text-white mb-2">Stop Chasing Rent.</span>
        <span className="block bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
          Start Growing Your Portfolio.
        </span>
      </motion.h1>

      {/* Value proposition */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-xl sm:text-2xl text-gray-300 mb-8 max-w-2xl mx-auto"
      >
        The only property management platform that{' '}
        <span className="text-white font-semibold">pays for itself</span> in saved time.
        Built by property managers who were tired of the status quo.
      </motion.p>

      {/* Key benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="flex flex-wrap justify-center gap-6 mb-8"
      >
        {keyBenefits.map((benefit, index) => (
          <div key={index} className="flex items-center gap-2 text-gray-300">
            <benefit.icon className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium">{benefit.text}</span>
          </div>
        ))}
      </motion.div>

      {/* CTA with arrow animation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
      >
        <button
          onClick={onCtaClick}
          className="group inline-flex items-center gap-3 px-8 py-4 text-xl font-semibold text-black bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full hover:from-emerald-500 hover:to-emerald-600 transform hover:scale-105 transition-all duration-200 shadow-lg shadow-emerald-500/25"
        >
          Claim Your Early Access Spot
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
        
        {/* Trust indicator */}
        <p className="mt-4 text-sm text-gray-400">
          No credit card required • Free for your first property • Export data anytime
        </p>
      </motion.div>
    </div>
  )
}