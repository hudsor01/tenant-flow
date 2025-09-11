import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, Check, TrendingUp, Users, Shield, Zap } from 'lucide-react'
import { Navbar } from '@/components/navbar'
import { FooterMinimal } from '@/components/sections/footer-minimal'
import { FeaturesSectionDemo3 } from '@/components/magicui/features-section-demo-3'

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="container mx-auto px-6 max-w-6xl text-center">
          <Badge variant="outline" className="mb-6">
            <Users className="w-4 h-4 mr-2" />
            Trusted by 10,000+ property managers
          </Badge>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Everything you need to
            <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              maximize your ROI
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Professional property managers increase NOI by 40% with TenantFlow's enterprise-grade 
            automation, advanced analytics, and scalable operations platform.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="px-8">
              Start 14-day transformation
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="px-8">
              See ROI calculator
            </Button>
          </div>
        </div>
      </section>

      {/* Main Features Section */}
      <FeaturesSectionDemo3 />

      {/* Key Benefits Grid */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Proven results that transform property management
            </h2>
            <p className="text-xl text-muted-foreground">
              Professional property managers use TenantFlow to reduce costs by 32%, increase NOI by 40%, and automate 80% of repetitive tasks
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Increase NOI by 40% Average</h3>
              <p className="text-muted-foreground mb-4">
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
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Automate 80% of Daily Tasks</h3>
              <p className="text-muted-foreground mb-4">
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
            
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Enterprise Security</h3>
              <p className="text-muted-foreground mb-4">
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
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="container mx-auto px-6 max-w-4xl text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Stop losing $2,400+ per property per year
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Professional property managers increase NOI by 40% with TenantFlow's enterprise-grade automation.
            ROI guaranteed in 90 days.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="px-8">
              Start 14-day transformation
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="px-8 text-white border-white hover:bg-white hover:text-blue-600">
              See ROI calculator
            </Button>
          </div>
        </div>
      </section>

      <FooterMinimal />
    </div>
  )
}