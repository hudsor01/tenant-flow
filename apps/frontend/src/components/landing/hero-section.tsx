import { Badge } from '@/components/ui/badge'
import { Sparkles } from 'lucide-react'
import { HeroButtons } from './hero-buttons'

export function HeroSection() {
  return (
    <section className="pt-32 pb-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 animate-gradient" />
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
      </div>
      
      <div className="container mx-auto text-center relative">
        <Badge className="mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
          <Sparkles className="w-3 h-3 mr-1" />
          New: AI-Powered Lease Generator Now Available
        </Badge>
        
        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 animate-fade-in-up">
          Property Management
          <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Made Simple
          </span>
        </h1>
        
        <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto animate-fade-in-up animation-delay-200">
          Save 10+ hours per week with the all-in-one platform trusted by 10,000+ property managers
        </p>
        
        <HeroButtons />
        
        <p className="mt-6 text-sm text-gray-500 animate-fade-in-up animation-delay-600">
          ✓ No credit card required &nbsp; ✓ Setup in 5 minutes &nbsp; ✓ Cancel anytime
        </p>
      </div>
    </section>
  )
}