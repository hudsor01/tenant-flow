import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Check, TrendingUp, Users, Shield, Zap } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { FooterMinimal } from '@/components/sections/footer-minimal'
import { FeaturesSectionDemo3 } from '@/components/magicui/features-section-demo-3'
import { BlurFade } from '@/components/magicui/blur-fade'
import { TYPOGRAPHY_SCALE } from '@repo/shared'
import { containerClasses } from '@/lib/design-system'

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-background via-background to-muted/20">
        <div className={containerClasses('xl')}>
          <BlurFade delay={0.1} inView>
            <div className="text-center max-w-4xl mx-auto space-y-8">
              <Badge variant="outline" className="mb-6">
                <Users className="w-4 h-4 mr-2" />
                Trusted by 10,000+ property managers
              </Badge>
              
              <h1 
                className="text-foreground font-bold tracking-tight leading-tight"
                style={TYPOGRAPHY_SCALE['display-lg']}
              >
                Everything you need to{' '}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                  maximize your ROI
                </span>
              </h1>
              
              <p 
                className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
                style={TYPOGRAPHY_SCALE['body-lg']}
              >
                Professional property managers increase NOI by 40% with TenantFlow's enterprise-grade 
                automation, advanced analytics, and scalable operations platform.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="xl" className="group">
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button size="xl" variant="outline">
                  Schedule Demo
                </Button>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* Main Features Section */}
      <FeaturesSectionDemo3 />

      {/* Key Benefits Grid */}
      <section className="py-24">
        <div className={containerClasses('xl')}>
          <BlurFade delay={0.2} inView>
            <div className="text-center mb-16 space-y-4">
              <h2 
                className="text-foreground font-bold tracking-tight"
                style={TYPOGRAPHY_SCALE['heading-xl']}
              >
                Proven results that transform property management
              </h2>
              <p 
                className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
                style={TYPOGRAPHY_SCALE['body-lg']}
              >
                Professional property managers use TenantFlow to reduce costs by 32%, increase NOI by 40%, and automate 80% of repetitive tasks
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-card rounded-2xl p-8 text-center border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg group">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 
                  className="font-semibold text-foreground mb-3"
                  style={TYPOGRAPHY_SCALE['heading-sm']}
                >
                  Increase NOI by 40% Average
                </h3>
                <p 
                  className="text-muted-foreground leading-relaxed mb-4"
                  style={TYPOGRAPHY_SCALE['body-sm']}
                >
                  Real-time financial analytics and automated rent optimization maximize property returns.
                  ROI in 90 days guaranteed.
                </p>
                <ul className="text-left space-y-2 text-sm">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    Automated rent optimization
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    Reduce vacancy time by 65%
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-green-500 mr-2" />
                    Pays for itself in 2.3 months
                  </li>
                </ul>
              </div>
            
              <div className="bg-card rounded-2xl p-8 text-center border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg group">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-cyan-500 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h3 
                  className="font-semibold text-foreground mb-3"
                  style={TYPOGRAPHY_SCALE['heading-sm']}
                >
                  Automate 80% of Daily Tasks
                </h3>
                <p 
                  className="text-muted-foreground leading-relaxed mb-4"
                  style={TYPOGRAPHY_SCALE['body-sm']}
                >
                  Smart workflows handle rent collection, lease renewals, and tenant communications automatically.
                  Save 20+ hours per week.
                </p>
                <ul className="text-left space-y-2 text-sm">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-blue-500 mr-2" />
                    Automated rent collection
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-blue-500 mr-2" />
                    Cut maintenance costs 32%
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-blue-500 mr-2" />
                    Smart tenant screening
                  </li>
                </ul>
              </div>
              
              <div className="bg-card rounded-2xl p-8 text-center border border-border/50 hover:border-primary/20 transition-all duration-300 hover:shadow-lg group">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 mx-auto mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-lg">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <h3 
                  className="font-semibold text-foreground mb-3"
                  style={TYPOGRAPHY_SCALE['heading-sm']}
                >
                  Enterprise Security
                </h3>
                <p 
                  className="text-muted-foreground leading-relaxed mb-4"
                  style={TYPOGRAPHY_SCALE['body-sm']}
                >
                  Bank-level security with SOC 2 compliance ensures your sensitive property and 
                  tenant data is always protected.
                </p>
                <ul className="text-left space-y-2 text-sm">
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-purple-500 mr-2" />
                    256-bit SSL encryption
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-purple-500 mr-2" />
                    SOC 2 Type II compliant
                  </li>
                  <li className="flex items-center">
                    <Check className="w-4 h-4 text-purple-500 mr-2" />
                    Regular security audits
                  </li>
                </ul>
              </div>
            </div>
          </BlurFade>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className={containerClasses('lg')}>
          <BlurFade delay={0.3} inView>
            <div className="text-center space-y-8">
              <h2 
                className="font-bold tracking-tight leading-tight"
                style={TYPOGRAPHY_SCALE['heading-xl']}
              >
                Ready to{' '}
                <span className="bg-gradient-to-r from-primary via-primary/80 to-accent bg-clip-text text-transparent">
                  maximize your ROI
                </span>
                ?
              </h2>
              <p 
                className="text-muted-foreground leading-relaxed max-w-2xl mx-auto"
                style={TYPOGRAPHY_SCALE['body-lg']}
              >
                Professional property managers increase NOI by 40% with TenantFlow's enterprise-grade automation.
                ROI guaranteed in 90 days.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="xl"
                  className="group"
                >
                  Start Free Trial
                  <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button 
                  variant="outline"
                  size="xl"
                >
                  Schedule Demo
                </Button>
              </div>
              <p 
                className="text-muted-foreground"
                style={TYPOGRAPHY_SCALE['body-sm']}
              >
                No setup fees • Enterprise security • 99.9% uptime SLA • Cancel anytime
              </p>
            </div>
          </BlurFade>
        </div>
      </section>

      <FooterMinimal />
    </div>
  )
}