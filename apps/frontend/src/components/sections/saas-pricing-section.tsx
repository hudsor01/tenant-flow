"use client"

import { Check, Zap, Crown, Building } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { BlurFade } from "@/components/magicui/blur-fade"
import { ShimmerButton } from "@/components/magicui/shimmer-button"
import { BorderBeam } from "@/components/magicui/border-beam"
import { cn } from "@/lib/utils"
import { useState } from "react"

interface SaasPricingSectionProps {
  className?: string
}

const pricingPlans = [
  {
    name: "Starter",
    description: "Perfect for individual property owners",
    icon: Building,
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      "Up to 5 properties",
      "Basic tenant management",
      "Rent collection",
      "Maintenance requests",
      "Financial reporting",
      "Email support",
      "Mobile app access"
    ],
    limitations: [
      "Limited to 50 units",
      "Basic analytics only"
    ],
    cta: "Start free trial",
    popular: false
  },
  {
    name: "Professional",
    description: "Ideal for growing property management businesses",
    icon: Zap,
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: [
      "Up to 50 properties",
      "Advanced tenant screening",
      "Automated rent collection",
      "Smart maintenance routing",
      "Advanced financial analytics",
      "Custom lease templates",
      "Priority phone support",
      "API access",
      "White-label tenant portal"
    ],
    limitations: [],
    cta: "Start free trial",
    popular: true
  },
  {
    name: "Enterprise",
    description: "For large-scale property management companies",
    icon: Crown,
    monthlyPrice: 299,
    yearlyPrice: 2990,
    features: [
      "Unlimited properties",
      "Multi-location management",
      "Advanced workflow automation",
      "Predictive analytics & AI insights",
      "Custom integrations",
      "Dedicated account manager",
      "24/7 phone & chat support",
      "SOC 2 compliance",
      "Single sign-on (SSO)",
      "Custom training sessions"
    ],
    limitations: [],
    cta: "Contact sales",
    popular: false
  }
]

const enterpriseFeatures = [
  "Volume discounts available",
  "Custom SLA agreements",
  "On-premise deployment options",
  "Custom feature development",
  "Priority feature requests",
  "Dedicated infrastructure"
]

export function SaasPricingSection({ className }: SaasPricingSectionProps) {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <section className={cn(
      "relative py-24 bg-gradient-to-b from-muted/20 to-background",
      className
    )}>
      <div className="container px-4 mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <BlurFade delay={0.1} inView>
            <Badge variant="outline" className="mb-4 px-3 py-1">
              <Crown className="w-4 h-4 mr-2" />
              Pricing
            </Badge>
          </BlurFade>
          
          <BlurFade delay={0.2} inView>
            <h2 className="text-4xl sm:text-5xl font-bold font-heading tracking-tight mb-6">
              Simple, transparent pricing
              <span className="block text-gradient-premium text-2xl sm:text-3xl font-normal mt-2">
                that grows with your business
              </span>
            </h2>
          </BlurFade>
          
          <BlurFade delay={0.3} inView>
            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              Start with our 14-day free trial. No credit card required. 
              Cancel anytime.
            </p>
          </BlurFade>

          {/* Billing Toggle */}
          <BlurFade delay={0.4} inView>
            <div className="flex items-center justify-center gap-4 mb-2">
              <span className={cn(
                "text-sm font-medium transition-colors",
                !isYearly ? "text-foreground" : "text-muted-foreground"
              )}>
                Monthly
              </span>
              <Switch
                checked={isYearly}
                onCheckedChange={setIsYearly}
                className="data-[state=checked]:bg-primary"
              />
              <span className={cn(
                "text-sm font-medium transition-colors",
                isYearly ? "text-foreground" : "text-muted-foreground"
              )}>
                Yearly
              </span>
              <Badge variant="secondary" className="ml-2 bg-green-500/10 text-green-600 dark:text-green-400">
                Save 17%
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              All plans include a 14-day free trial
            </p>
          </BlurFade>
        </div>

        {/* Pricing Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
          {pricingPlans.map((plan, index) => (
            <BlurFade key={index} delay={0.1 + index * 0.1} inView>
              <Card className={cn(
                "relative h-full transition-all duration-300 hover:scale-105",
                plan.popular 
                  ? "border-2 border-primary shadow-xl scale-105" 
                  : "border border-border hover:border-primary/50"
              )}>
                {plan.popular && (
                  <>
                    <BorderBeam size={250} duration={12} delay={9} />
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-4 py-1">
                        Most Popular
                      </Badge>
                    </div>
                  </>
                )}

                <CardHeader className="text-center pb-8 pt-8">
                  <div className="mb-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mx-auto mb-4",
                      plan.popular 
                        ? "from-primary to-primary/80" 
                        : "from-muted to-muted/50"
                    )}>
                      <plan.icon className={cn(
                        "w-6 h-6",
                        plan.popular ? "text-primary-foreground" : "text-foreground"
                      )} />
                    </div>
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    {plan.description}
                  </p>
                  
                  <div className="space-y-1">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">
                        ${isYearly ? Math.floor(plan.yearlyPrice / 12) : plan.monthlyPrice}
                      </span>
                      <span className="text-muted-foreground text-sm">/month</span>
                    </div>
                    {isYearly && (
                      <div className="text-xs text-muted-foreground">
                        ${plan.yearlyPrice} billed annually
                      </div>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="px-6 pb-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center text-sm">
                        <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                    {plan.limitations.map((limitation, limitIndex) => (
                      <li key={limitIndex} className="flex items-center text-sm text-muted-foreground">
                        <div className="w-4 h-4 mr-3 flex-shrink-0">
                          <div className="w-1 h-1 rounded-full bg-muted-foreground mx-auto"></div>
                        </div>
                        <span>{limitation}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="px-6 pb-8">
                  {plan.popular ? (
                    <ShimmerButton
                      shimmerColor="#ffffff"
                      shimmerSize="0.05em"
                      shimmerDuration="3s"
                      borderRadius="8px"
                      background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                      className="button-primary button-lg w-full"
                    >
                      {plan.cta}
                    </ShimmerButton>
                  ) : (
                    <Button 
                      variant={plan.name === "Enterprise" ? "outline" : "default"}
                      className={`w-full ${plan.name === "Enterprise" ? "button-secondary" : "button-primary"} button-lg`}
                    >
                      {plan.cta}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </BlurFade>
          ))}
        </div>

        {/* Enterprise Features */}
        <BlurFade delay={0.6} inView>
          <div className="surface-glow card-elevated-gradient rounded-2xl border border-border/20 p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2 text-gradient-premium">Enterprise Benefits</h3>
              <p className="text-muted-foreground text-lg">
                Additional features and support for enterprise customers
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enterpriseFeatures.map((feature, index) => (
                <div key={index} className="flex items-center text-sm">
                  <Check className="w-4 h-4 text-green-500 mr-3 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </BlurFade>

        {/* FAQ Teaser */}
        <BlurFade delay={0.7} inView>
          <div className="text-center mt-16">
            <p className="text-muted-foreground mb-6 text-lg">
              Questions about our pricing?
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button className="button-secondary button-lg">
                View FAQ
              </Button>
              <Button className="button-ghost button-lg">
                Contact support
              </Button>
            </div>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}