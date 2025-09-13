import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, HelpCircle } from 'lucide-react'
import { BlurFade } from '@/components/magicui/blur-fade'
import { TYPOGRAPHY_SCALE, ANIMATION_DURATIONS } from '@repo/shared'

export default function NotFound() {
  return (
    <div className="min-h-screen gradient-authority flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        
        {/* 404 Animation */}
        <BlurFade delay={0.1} inView>
          <div className="relative">
            <div 
              className="text-9xl font-bold bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent select-none"
              style={{
                fontSize: '8rem',
                lineHeight: '1',
                letterSpacing: '-0.05em',
                fontWeight: '900'
              }}
            >
              404
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-6 h-6 rounded-full bg-primary/20 animate-bounce delay-100" />
            <div className="absolute -bottom-2 -left-2 w-4 h-4 rounded-full bg-accent/30 animate-bounce delay-300" />
            <div className="absolute top-1/2 -right-8 w-2 h-2 rounded-full bg-primary/40 animate-ping delay-500" />
          </div>
        </BlurFade>

        {/* Error Message */}
        <BlurFade delay={0.2} inView>
          <div className="space-y-4">
            <h1 
              className="text-gradient-authority font-bold tracking-tight"
              style={TYPOGRAPHY_SCALE['heading-lg']}
            >
              Page not found
            </h1>
            <p 
              className="text-muted-foreground leading-relaxed"
              style={TYPOGRAPHY_SCALE['body-md']}
            >
              The page you're looking for doesn't exist or has been moved. 
              Don't worry, let's get you back on track.
            </p>
          </div>
        </BlurFade>

        {/* Action Buttons */}
        <BlurFade delay={0.3} inView>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              asChild 
              size="lg"
              className="group transition-all hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl"
              style={{
                transition: `all ${ANIMATION_DURATIONS.medium} cubic-bezier(0.4, 0, 0.2, 1)`
              }}
            >
              <Link href="/" className="flex items-center gap-2">
                <Home className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
                Back to Home
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
              <Link href="/contact" className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 transition-transform group-hover:rotate-12" />
                Get Help
              </Link>
            </Button>
          </div>
        </BlurFade>

        {/* Quick Links */}
        <BlurFade delay={0.4} inView>
          <div className="pt-8 border-t border-border/50">
            <p 
              className="text-muted-foreground mb-4"
              style={TYPOGRAPHY_SCALE['body-sm']}
            >
              Popular pages
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link 
                href="/features" 
                className="group p-3 rounded-lg hover:bg-muted/50 transition-all duration-200 text-left"
              >
                <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                  Features
                </div>
                <div className="text-xs text-muted-foreground">
                  See what we offer
                </div>
              </Link>
              
              <Link 
                href="/pricing" 
                className="group p-3 rounded-lg hover:bg-muted/50 transition-all duration-200 text-left"
              >
                <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                  Pricing
                </div>
                <div className="text-xs text-muted-foreground">
                  View our plans
                </div>
              </Link>
              
              <Link 
                href="/blog" 
                className="group p-3 rounded-lg hover:bg-muted/50 transition-all duration-200 text-left"
              >
                <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                  Blog
                </div>
                <div className="text-xs text-muted-foreground">
                  Latest insights
                </div>
              </Link>
              
              <Link 
                href="/contact" 
                className="group p-3 rounded-lg hover:bg-muted/50 transition-all duration-200 text-left"
              >
                <div className="font-medium text-foreground group-hover:text-primary transition-colors">
                  Support
                </div>
                <div className="text-xs text-muted-foreground">
                  We're here to help
                </div>
              </Link>
            </div>
          </div>
        </BlurFade>
        
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 bg-grid-small-black/[0.02] dark:bg-grid-small-white/[0.02] -z-10" />
      </div>
    </div>
  )
}
