import { 
  Clock,
  TrendingUp,
  Zap,
  Star
} from 'lucide-react'

const benefits = [
  { metric: '10+', label: 'Hours Saved Weekly', icon: Clock },
  { metric: '99%', label: 'On-Time Payments', icon: TrendingUp },
  { metric: '85%', label: 'Less Admin Work', icon: Zap },
  { metric: '4.9★', label: 'Customer Rating', icon: Star }
]

export function StatsSection() {
  return (
    <section className="py-12 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="container mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {benefits.map((benefit, index) => (
            <div key={index} className="text-center">
              <benefit.icon className="w-8 h-8 mx-auto mb-2 opacity-80" />
              <div className="text-3xl font-bold">{benefit.metric}</div>
              <div className="text-sm opacity-90">{benefit.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}