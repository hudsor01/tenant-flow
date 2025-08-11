import { Badge } from '@/components/ui/badge'
import { Sparkles, Shield, Zap, Users } from 'lucide-react'
import { HeroButtons } from './hero-buttons'

export function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-4 relative overflow-hidden min-h-[90vh] flex items-center">
      {/* Enhanced gradient background with glassmorphism */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-purple-50/50 to-pink-50/50" />
      
      {/* Animated blobs with better colors */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-96 h-96 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-40 w-96 h-96 bg-gradient-to-br from-pink-400 to-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
      </div>
      
      <div className="container mx-auto text-center relative z-10">
        {/* Enhanced badge with shadow */}
        <Badge className="mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 px-4 py-1.5 shadow-lg shadow-purple-500/20">
          <Sparkles className="w-4 h-4 mr-2" />
          New: AI-Powered Lease Generator Now Available
        </Badge>
        
        {/* Enhanced heading with better typography */}
        <h1 className="text-6xl md:text-8xl font-bold mb-6 animate-fade-in-up">
          <span className="text-gray-900">Property Management</span>
          <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mt-2">
            Made Simple
          </span>
        </h1>
        
        {/* Enhanced subtitle */}
        <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto animate-fade-in-up animation-delay-200 leading-relaxed">
          Save 10+ hours per week with the all-in-one platform trusted by 10,000+ property managers
        </p>
        
        {/* CTA Buttons */}
        <HeroButtons />
        
        {/* Trust indicators with icons */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-600 animate-fade-in-up animation-delay-600">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-green-600" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-600" />
            <span>Setup in 5 minutes</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-600" />
            <span>Join 10,000+ users</span>
          </div>
        </div>
      </div>
    </section>
  )
}