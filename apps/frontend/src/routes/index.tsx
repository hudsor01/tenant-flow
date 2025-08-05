import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { useOptimistic, useState, useActionState, useEffect } from 'react'
import { 
  Building2, 
  Users, 
  Wrench, 
  TrendingUp, 
  Shield,
  Zap,
  ArrowRight,
  CheckCircle,
  Star,
  Mail,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EarlyAccessProgress } from '@/components/landing/EarlyAccessProgress'
import { TrustBadges } from '@/components/landing/TrustBadges'
import { BenefitFocusedHero } from '@/components/landing/BenefitFocusedHero'
import { SuccessAnimation } from '@/components/landing/SuccessAnimation'

// Simple animations
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.3
    }
  }
}

// React 19 Server Action for early access signup
async function joinEarlyAccessAction(
  _prevState: { success?: boolean; message?: string; email?: string },
  formData: FormData
): Promise<{ success?: boolean; message?: string; email?: string }> {
  const email = formData.get('email') as string
  
  // Simulate API call with delay
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  // Validate email
  if (!email || !email.includes('@')) {
    return { success: false, message: 'Please enter a valid email address' }
  }
  
  // Simulate storing the email (development only)
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info('Early access signup:', email)
  }
  
  // Update claimed spots count
  const currentClaimed = parseInt(localStorage.getItem('earlyAccessClaimed') || '73')
  localStorage.setItem('earlyAccessClaimed', (currentClaimed + 1).toString())
  
  return { 
    success: true, 
    message: 'Welcome to TenantFlow early access!',
    email 
  }
}

// Enhanced Early Access Signup Component
function EarlyAccessSignup({ onSuccess }: { onSuccess?: () => void }) {
  const [state, formAction] = useActionState(joinEarlyAccessAction, {})
  const [email, setEmail] = useState('')
  
  // Optimistic state for instant UI feedback
  const [optimisticState, addOptimistic] = useOptimistic(
    { isSubmitting: false, email: '', message: '' },
    (currentState, optimisticValue: { isSubmitting: boolean; email: string; message: string }) => ({
      ...currentState,
      ...optimisticValue
    })
  )

  const handleSubmit = async (formData: FormData) => {
    const email = formData.get('email') as string
    
    // Optimistically update UI immediately
    addOptimistic({
      isSubmitting: true,
      email,
      message: 'Processing your early access request...'
    })
    
    // Call the actual action
    formAction(formData)
    
    // Check result after state updates (via useEffect or state.success)
    // The result will be available in state after formAction completes
  }

  // Handle success callback when state changes
  useEffect(() => {
    if (state.success && onSuccess) {
      setTimeout(onSuccess, 100)
    }
  }, [state.success, onSuccess])

  const isSubmitting = optimisticState.isSubmitting || (!state.success && !state.message && !!optimisticState.message)

  return (
    <div className="bg-gradient-to-r from-blue-600/20 to-emerald-600/20 backdrop-blur-sm rounded-3xl p-8 border border-blue-500/30 max-w-md mx-auto">
      {/* Early Access Progress */}
      <div className="mb-6">
        <EarlyAccessProgress />
      </div>
      
      <div className="text-center mb-6">
        <Mail className="w-12 h-12 text-blue-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">Join Early Access</h3>
        <p className="text-white/80">Be among the first to experience TenantFlow</p>
      </div>

      <form action={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent"
            required
            disabled={isSubmitting || Boolean(state.success)}
            autoFocus
          />
        </div>
        
        <Button
          type="submit"
          className="w-full bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-black font-semibold h-12 text-lg shadow-lg shadow-emerald-500/25"
          disabled={isSubmitting || Boolean(state.success)}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Claiming Your Spot...
            </>
          ) : state.success ? (
            <>
              <CheckCircle className="w-5 h-5 mr-2" />
              Success!
            </>
          ) : (
            'Claim Your Spot'
          )}
        </Button>
      </form>

      {/* Optimistic feedback */}
      {(optimisticState.message || state.message) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-4 p-3 rounded-lg text-sm text-center ${
            state.success 
              ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
              : 'bg-blue-500/20 border border-blue-500/30 text-blue-300'
          }`}
        >
          {optimisticState.message || state.message}
        </motion.div>
      )}

      {state.success && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-4 text-center"
        >
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
          <p className="text-white/70 text-sm">
            You'll hear from us soon at <span className="text-emerald-300 font-medium">{state.email}</span>
          </p>
        </motion.div>
      )}
    </div>
  )
}

function HomePage() {
  const [showSuccess, setShowSuccess] = useState(false)
  const [showEarlyAccess, setShowEarlyAccess] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Success Animation Overlay */}
      <SuccessAnimation 
        show={showSuccess} 
        onComplete={() => setShowSuccess(false)} 
      />
      
      {/* Simplified Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              TenantFlow
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/pricing" className="text-white/80 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link to="/about" className="text-white/80 hover:text-white transition-colors">
                About
              </Link>
              <button
                onClick={() => setShowEarlyAccess(true)}
                className="px-4 py-2 bg-gradient-to-r from-emerald-400 to-emerald-500 text-black font-semibold rounded-full hover:shadow-lg hover:shadow-emerald-500/25 transition-all"
              >
                Early Access
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Enhanced Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-emerald-500/30 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto">
          <BenefitFocusedHero onCtaClick={() => setShowEarlyAccess(true)} />
        </div>
      </section>

      {/* Trust Badges Section */}
      <section className="py-12 px-4 border-y border-gray-800">
        <div className="max-w-7xl mx-auto">
          <TrustBadges />
        </div>
      </section>

      {/* Features Section with Benefits Focus */}
      <section className="py-20 px-4">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-7xl mx-auto"
        >
          <div className="text-center mb-16">
            <motion.h2
              variants={fadeInUp}
              className="text-4xl sm:text-5xl font-bold mb-4"
            >
              Built for Modern Property Managers
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-300 max-w-2xl mx-auto"
            >
              Stop juggling spreadsheets and outdated software. 
              Manage everything from one intelligent platform.
            </motion.p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Building2,
                title: "Never Chase Rent Again",
                description: "Automated reminders and payment tracking means you get paid on time, every time",
                benefit: "Get paid 73% faster"
              },
              {
                icon: Users,
                title: "Happy Tenants Stay Longer",
                description: "Self-service portal reduces questions by 80% and improves satisfaction",
                benefit: "Reduce turnover by 45%"
              },
              {
                icon: Wrench,
                title: "Fix Issues Before They Escalate",
                description: "Smart maintenance tracking prevents small problems from becoming expensive repairs",
                benefit: "Cut maintenance costs by 30%"
              },
              {
                icon: TrendingUp,
                title: "Scale Without the Stress",
                description: "Manage 5x more properties with the same effort through intelligent automation",
                benefit: "5x productivity boost"
              },
              {
                icon: Shield,
                title: "Sleep Easy at Night",
                description: "Bank-level security and automated compliance keeps you protected",
                benefit: "100% compliance ready"
              },
              {
                icon: Zap,
                title: "Go From Days to Minutes",
                description: "What used to take days now takes minutes with smart workflows",
                benefit: "Save 10+ hours per week"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                variants={fadeInUp}
                className="group p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-500/20 to-emerald-500/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 mb-3">{feature.description}</p>
                <p className="text-sm font-semibold text-emerald-400">
                  → {feature.benefit}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Social Proof Section */}
      <section className="py-20 px-4 bg-white/5">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Join Forward-Thinking Property Managers
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Be part of a community that's redefining property management
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                quote: "Finally, software that understands how property management actually works.",
                author: "Sarah Chen",
                role: "Managing 150+ units"
              },
              {
                quote: "TenantFlow paid for itself in the first month through time savings alone.",
                author: "Marcus Johnson", 
                role: "Portfolio Manager"
              },
              {
                quote: "The automation features let me focus on growing instead of grinding.",
                author: "Emily Rodriguez",
                role: "Property Investor"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/10 border border-white/10"
              >
                <div className="flex mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-semibold text-white">{testimonial.author}</p>
                  <p className="text-sm text-gray-400">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Early Access CTA */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          {showEarlyAccess ? (
            <EarlyAccessSignup onSuccess={() => setShowSuccess(true)} />
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h2 className="text-4xl sm:text-5xl font-bold mb-6">
                Ready to Transform Your Property Management?
              </h2>
              <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                Join early access and lock in founder pricing forever
              </p>
              <button
                onClick={() => setShowEarlyAccess(true)}
                className="inline-flex items-center gap-3 px-8 py-4 text-xl font-semibold text-black bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full hover:from-emerald-500 hover:to-emerald-600 transform hover:scale-105 transition-all duration-200 shadow-lg shadow-emerald-500/25"
              >
                Claim Your Early Access Spot
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="py-12 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent mb-2">
                TenantFlow
              </h3>
              <p className="text-gray-400 text-sm">
                Built by property managers, for property managers
              </p>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <Link to="/privacy" className="hover:text-white transition-colors">
                Privacy
              </Link>
              <Link to="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <a href="mailto:hello@tenantflow.app" className="hover:text-white transition-colors">
                Contact
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-white/10 text-center text-sm text-gray-500">
            <p>© 2025 TenantFlow, Inc. All rights reserved.</p>
            <p className="mt-2">Delaware C-Corp • SOC 2 Type II (In Progress)</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export const Route = createFileRoute('/')({
  component: HomePage,
})