import { Shield, Star, Zap, Users, TrendingUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface PricingHeaderProps {
  className?: string
}

/**
 * Pricing page header with trust indicators and value proposition
 */
export function PricingHeader({ className }: PricingHeaderProps) {
  return (
    <div className={`text-center mb-16 ${className || ''}`}>
      {/* Main heading */}
      <div className="mb-8">
        <Badge variant="secondary" className="mb-4 px-4 py-2">
          ✨ Professional Property Management
        </Badge>
        
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
          Simple, Transparent
          <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
            {' '}Pricing
          </span>
        </h1>
        
        <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
          Start with our free trial, then scale as your portfolio grows. 
          All plans include our core property management features with no hidden fees.
        </p>
      </div>

      {/* Trust indicators */}
      <div className="flex flex-wrap items-center justify-center gap-8 text-gray-500 text-sm mb-8">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-600" />
          <span>Bank-level Security</span>
        </div>
        <div className="flex items-center gap-2">
          <Star className="w-4 h-4 text-yellow-500" />
          <span>5-star Support</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-primary" />
          <span>Instant Setup</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-purple-600" />
          <span>10,000+ Properties Managed</span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span>99.9% Uptime</span>
        </div>
      </div>

      {/* Key benefits */}
      <div className="bg-white rounded-2xl shadow-lg border p-8 max-w-4xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6 text-left">
          <div className="space-y-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-semibold text-gray-900">Get Started in Minutes</h3>
            <p className="text-sm text-gray-600">
              No complex setup. Start managing properties immediately with our intuitive platform.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Scale as You Grow</h3>
            <p className="text-sm text-gray-600">
              Flexible plans that grow with your business. Upgrade anytime without losing data.
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900">Enterprise Security</h3>
            <p className="text-sm text-gray-600">
              Bank-grade encryption and compliance. Your data is always protected and secure.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}