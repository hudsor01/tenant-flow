'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

export function CTAGradient() {
  return (
    <section className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 px-8 py-16 text-center text-white md:px-16 md:py-24">
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-20"></div>
          
          <div className="relative z-10">
            <Badge variant="secondary" className="mb-4 bg-white/20 text-white border-white/30">
              <Sparkles className="w-4 h-4 mr-2" />
              Transform Your Business
            </Badge>
            
            <h2 className="text-balance text-4xl font-bold lg:text-6xl mb-6">
              Ready to Scale Your
              <br />
              Property Portfolio?
            </h2>
            
            <p className="mx-auto max-w-2xl text-lg text-blue-100 mb-8 leading-relaxed">
              Join 10,000+ property managers who've increased their efficiency by 300% 
              with TenantFlow's automated workflows and smart insights.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                asChild 
                size="lg" 
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl"
              >
                <Link href="/auth/sign-up" className="group">
                  Start 14-Day Free Trial
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              
              <Button 
                asChild 
                size="lg" 
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10"
              >
                <Link href="/demo">
                  Watch Demo
                </Link>
              </Button>
            </div>

            <div className="mt-8 text-sm text-blue-200">
              No credit card required • Cancel anytime • Setup in 5 minutes
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}