import { Shield, Lock, Database, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'

const trustItems = [
  {
    icon: Lock,
    title: "Bank-Level Security",
    description: "256-bit SSL encryption"
  },
  {
    icon: Shield,
    title: "SOC 2 Type II",
    description: "In progress"
  },
  {
    icon: Database,
    title: "Your Data, Your Control",
    description: "Export anytime"
  },
  {
    icon: CheckCircle2,
    title: "GDPR Compliant",
    description: "Privacy by design"
  }
]

export function TrustBadges() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
      {trustItems.map((item, index) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className="text-center group"
        >
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-800/50 border border-gray-700 group-hover:border-emerald-500/50 transition-colors mb-2">
            <item.icon className="w-6 h-6 text-emerald-400" />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">
            {item.title}
          </h4>
          <p className="text-xs text-gray-400">
            {item.description}
          </p>
        </motion.div>
      ))}
    </div>
  )
}