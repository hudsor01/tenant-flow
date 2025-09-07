"use client"

import { Star, Quote, ArrowRight } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BlurFade } from "@/components/magicui/blur-fade"
import { MagicCard } from "@/components/magicui/magic-card"
import { cn } from "@/lib/utils"

interface SaasTestimonialsSectionProps {
  className?: string
}

const testimonials = [
  {
    quote: "TenantFlow transformed our property management operations completely. We've reduced administrative overhead by 60% while improving tenant satisfaction scores. The automation features alone have saved us countless hours every week.",
    author: "Sarah Chen",
    role: "CEO",
    company: "Urban Properties Group",
    avatar: "/avatars/sarah-chen.jpg",
    rating: 5,
    metrics: "60% less admin overhead",
    companyLogo: "/logos/urban-properties.svg"
  },
  {
    quote: "The financial analytics and reporting capabilities are outstanding. We now have real-time visibility into our portfolio performance and can make data-driven decisions that have increased our ROI by 25%.",
    author: "Marcus Rodriguez",
    role: "Portfolio Manager", 
    company: "Prime Real Estate",
    avatar: "/avatars/marcus-rodriguez.jpg",
    rating: 5,
    metrics: "25% ROI increase",
    companyLogo: "/logos/prime-real-estate.svg"
  },
  {
    quote: "Implementation was seamless and the support team is exceptional. Our tenants love the self-service portal and maintenance requests are handled 3x faster now. This is exactly what we needed to scale our business.",
    author: "Emily Watson",
    role: "Operations Director",
    company: "Metropolitan Management",
    avatar: "/avatars/emily-watson.jpg", 
    rating: 5,
    metrics: "3x faster maintenance",
    companyLogo: "/logos/metropolitan.svg"
  },
  {
    quote: "TenantFlow's automation features have been a game-changer for our growing portfolio. Rent collection is now 99% automated and we've eliminated nearly all late payments. The time savings allow us to focus on growth.",
    author: "David Kim",
    role: "Founder",
    company: "NextGen Properties",
    avatar: "/avatars/david-kim.jpg",
    rating: 5,
    metrics: "99% automated collection",
    companyLogo: "/logos/nextgen.svg"
  },
  {
    quote: "The predictive analytics help us optimize rental pricing and reduce vacancy rates. We've seen a 15% increase in revenue per unit since implementing TenantFlow's recommendations.",
    author: "Lisa Thompson",
    role: "Revenue Manager",
    company: "Apex Living",
    avatar: "/avatars/lisa-thompson.jpg",
    rating: 5,
    metrics: "15% revenue increase",
    companyLogo: "/logos/apex-living.svg"
  },
  {
    quote: "Customer support is world-class. Any question or issue is resolved within hours. The platform reliability is outstanding - 99.9% uptime means we never worry about system availability.",
    author: "James Miller",
    role: "CTO",
    company: "Scale Properties",
    avatar: "/avatars/james-miller.jpg",
    rating: 5,
    metrics: "99.9% uptime achieved",
    companyLogo: "/logos/scale-properties.svg"
  }
]

const companyLogos = [
  { name: "Urban Properties", logo: "/logos/company1.svg" },
  { name: "Prime Real Estate", logo: "/logos/company2.svg" },
  { name: "Metropolitan Management", logo: "/logos/company3.svg" },
  { name: "NextGen Properties", logo: "/logos/company4.svg" },
  { name: "Apex Living", logo: "/logos/company5.svg" },
  { name: "Scale Properties", logo: "/logos/company6.svg" },
  { name: "Global Realty", logo: "/logos/company7.svg" },
  { name: "Premier Properties", logo: "/logos/company8.svg" }
]

const stats = [
  { value: "4.9/5", label: "Customer Rating", sublabel: "From 2,500+ reviews" },
  { value: "99.9%", label: "Uptime SLA", sublabel: "Guaranteed reliability" },
  { value: "24hrs", label: "Implementation", sublabel: "Average setup time" },
  { value: "50%", label: "Time Saved", sublabel: "On property operations" }
]

export function SaasTestimonialsSection({ className }: SaasTestimonialsSectionProps) {
  return (
    <section className={cn(
      "relative py-24 bg-gradient-to-b from-background to-muted/10",
      className
    )}>
      <div className="container px-4 mx-auto">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <BlurFade delay={0.1} inView>
            <Badge variant="outline" className="mb-4 px-3 py-1">
              <Star className="w-4 h-4 mr-2" />
              Customer Stories
            </Badge>
          </BlurFade>
          
          <BlurFade delay={0.2} inView>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">
              Trusted by property managers
              <span className="block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                who demand excellence
              </span>
            </h2>
          </BlurFade>
          
          <BlurFade delay={0.3} inView>
            <p className="text-xl text-muted-foreground leading-relaxed">
              Join thousands of property managers who have transformed their operations 
              with TenantFlow's comprehensive platform.
            </p>
          </BlurFade>
        </div>

        {/* Social Proof Stats */}
        <BlurFade delay={0.4} inView>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
                  {stat.value}
                </div>
                <div className="text-sm font-medium text-foreground mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stat.sublabel}
                </div>
              </div>
            ))}
          </div>
        </BlurFade>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {testimonials.map((testimonial, index) => (
            <BlurFade key={index} delay={0.1 + (index * 0.1)} inView>
              <MagicCard
                className="h-full cursor-pointer card-elevated-gradient transition-all duration-300 hover:scale-105 hover:shadow-xl"
                gradientColor="#262626"
                gradientOpacity={0.05}
              >
                <CardContent className="p-8 h-full flex flex-col">
                  {/* Rating */}
                  <div className="flex items-center mb-4">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>

                  {/* Quote */}
                  <div className="relative flex-1 mb-6">
                    <Quote className="w-8 h-8 text-muted-foreground/20 mb-4" />
                    <p className="text-foreground leading-relaxed text-sm">
                      "{testimonial.quote}"
                    </p>
                  </div>

                  {/* Metrics Badge */}
                  <div className="mb-6">
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
                      {testimonial.metrics}
                    </Badge>
                  </div>

                  {/* Author */}
                  <div className="flex items-center">
                    <Avatar className="w-12 h-12 mr-4">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {testimonial.author.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold text-foreground text-sm">
                        {testimonial.author}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {testimonial.role}
                      </div>
                      <div className="text-muted-foreground text-xs font-medium">
                        {testimonial.company}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </MagicCard>
            </BlurFade>
          ))}
        </div>

        {/* Company Logos */}
        <BlurFade delay={0.8} inView>
          <div className="text-center mb-12">
            <p className="text-sm text-muted-foreground mb-8">
              Trusted by leading property management companies worldwide
            </p>
            <div className="grid grid-cols-4 lg:grid-cols-8 gap-8 items-center opacity-60">
              {companyLogos.map((company, index) => (
                <div key={index} className="flex items-center justify-center h-12">
                  {/* Placeholder for company logos */}
                  <div className="w-24 h-8 bg-gradient-to-r from-muted to-muted/50 rounded flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground truncate px-2">
                      {company.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </BlurFade>

        {/* CTA Section */}
        <BlurFade delay={0.9} inView>
          <div className="text-center">
            <Card className="inline-block p-8 surface-glow card-elevated-gradient border-border/20">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold mb-4 text-gradient-premium">
                  Ready to join thousands of satisfied customers?
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                  Start your 14-day free trial today and see why property managers 
                  choose TenantFlow for their operations.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button className="button-primary button-lg group">
                    Start free trial
                    <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
                  </Button>
                  <Button className="button-secondary button-lg">
                    Schedule demo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </BlurFade>
      </div>
    </section>
  )
}