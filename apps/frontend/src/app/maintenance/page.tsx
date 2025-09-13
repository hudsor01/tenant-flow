import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Construction, Clock, Mail, Twitter, ArrowLeft } from 'lucide-react'
import { BlurFade } from '@/components/magicui/blur-fade'
import { TYPOGRAPHY_SCALE, ANIMATION_DURATIONS } from '@repo/shared'

export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-10">
        
        {/* Maintenance Animation */}
        <BlurFade delay={0.1} inView>
          <div className="relative">
            <div className="relative inline-block">
              <Construction 
                className="w-24 h-24 mx-auto text-primary animate-bounce"
                style={{
                  animationDuration: '2s',
                  filter: 'drop-shadow(0 4px 6px rgb(0 0 0 / 0.1))'
                }}
              />
              
              {/* Floating tool elements */}
              <div className="absolute -top-2 -right-4 w-4 h-4 rounded bg-accent/60 animate-bounce delay-200" />
              <div className="absolute -bottom-3 -left-6 w-3 h-3 rounded bg-primary/40 animate-bounce delay-500" />
              <div className="absolute top-1/3 -right-8 w-2 h-2 rounded-full bg-primary/60 animate-ping delay-700" />
            </div>
          </div>
        </BlurFade>

        {/* Maintenance Message */}
        <BlurFade delay={0.2} inView>
          <div className="space-y-6">
            <h1 
              className="text-foreground font-bold tracking-tight leading-tight"
              style={TYPOGRAPHY_SCALE['display-lg']}
            >
              We'll be right back
            </h1>
            
            <div className="space-y-4">
              <p 
                className="text-muted-foreground leading-relaxed max-w-lg mx-auto"
                style={TYPOGRAPHY_SCALE['body-lg']}
              >
                We're performing some scheduled maintenance to make TenantFlow even better. 
                We'll be back up and running shortly.
              </p>
              
              <div className="inline-flex items-center gap-2 text-primary/80">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Estimated downtime: 30 minutes
                </span>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* Progress Indicator */}
        <BlurFade delay={0.3} inView>
          <div className="space-y-4">
            <div className="bg-muted rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full animate-pulse"
                style={{ 
                  width: '75%',
                  transition: `width ${ANIMATION_DURATIONS.slower} ease-out`
                }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Upgrading servers and improving performance...
            </p>
          </div>
        </BlurFade>

        {/* Action Buttons */}
        <BlurFade delay={0.4} inView>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild
              size="lg"
              className="group transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              style={{
                transition: `all ${ANIMATION_DURATIONS.medium} cubic-bezier(0.4, 0, 0.2, 1)`
              }}
            >
              <Link href="/" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                Return Home
              </Link>
            </Button>
            
            <Button 
              asChild
              variant="outline"
              size="lg" 
              className="group transition-all hover:scale-105 active:scale-95 border-2 hover:border-primary/50"
              style={{
                transition: `all ${ANIMATION_DURATIONS.medium} cubic-bezier(0.4, 0, 0.2, 1)`
              }}
            >
              <Link href="/status" className="flex items-center gap-2">
                <Clock className="w-4 h-4 transition-transform group-hover:rotate-12" />
                Status Page
              </Link>
            </Button>
          </div>
        </BlurFade>

        {/* Stay Updated */}
        <BlurFade delay={0.5} inView>
          <div className="pt-8 border-t border-border/50">
            <p 
              className="text-muted-foreground mb-6"
              style={TYPOGRAPHY_SCALE['body-sm']}
            >
              Stay updated on our progress
            </p>
            
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://twitter.com/tenantflow"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 transition-all duration-200"
              >
                <Twitter className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Follow updates</span>
              </a>
              
              <Link
                href="/contact"
                className="group inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-all duration-200"
              >
                <Mail className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">Contact support</span>
              </Link>
            </div>
          </div>
        </BlurFade>

        {/* Maintenance Details */}
        <BlurFade delay={0.6} inView>
          <div className="bg-card/50 backdrop-blur-sm rounded-xl p-6 border border-border/50">
            <h3 className="font-semibold text-foreground mb-4">
              What we're working on
            </h3>
            
            <div className="space-y-3 text-sm text-muted-foreground text-left">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Database optimization - Complete</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                <span>Server upgrades - In Progress</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span>Performance enhancements - Pending</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gray-400 rounded-full" />
                <span>Security updates - Pending</span>
              </div>
            </div>
          </div>
        </BlurFade>
        
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-grid-small-black/[0.02] dark:bg-grid-small-white/[0.02] -z-10" />
      </div>
    </div>
  )
}