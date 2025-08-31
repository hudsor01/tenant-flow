import type { Meta, StoryObj } from '@storybook/react';
import { AnimatedGradientText } from '@/components/magicui/animated-gradient-text';
import { ShimmerButton } from '@/components/magicui/shimmer-button';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import { InteractiveHoverButton } from '@/components/magicui/interactive-hover-button';
import { BorderBeam } from '@/components/magicui/border-beam';
import { BlurFade } from '@/components/magicui/blur-fade';
import { Ripple } from '@/components/magicui/ripple';
import { NumberTicker } from '@/components/magicui/number-ticker';
import { Marquee } from '@/components/magicui/marquee';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const meta: Meta = {
  title: 'Magic UI/Overview/Component Showcase',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'A comprehensive showcase of all Magic UI components implemented in TenantFlow. This demonstrates how these components work together to create engaging user experiences.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data for demos
const testimonials = [
  { name: "Sarah Johnson", role: "Property Manager", content: "TenantFlow revolutionized our operations", company: "Metro Properties" },
  { name: "Mike Chen", role: "Real Estate Investor", content: "Best investment I've made this year", company: "Chen Investments" },
  { name: "Lisa Rodriguez", role: "Landlord", content: "Simplified everything for our tenants", company: "Rodriguez Rentals" },
  { name: "David Kim", role: "Property Owner", content: "Incredible ROI and time savings", company: "Kim Holdings" },
];

const TestimonialCard = ({ name, role, content, company }: typeof testimonials[0]) => (
  <Card className="mx-4 w-80 flex-shrink-0">
    <CardContent className="pt-6">
      <p className="text-sm text-muted-foreground mb-4">"{content}"</p>
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
          {name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <p className="font-semibold text-sm">{name}</p>
          <p className="text-xs text-muted-foreground">{role} at {company}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export const LandingPageDemo: Story = {
  render: () => (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Ripple Background */}
      <section className="relative py-20 px-6 text-center overflow-hidden">
        <div className="relative z-10 max-w-4xl mx-auto space-y-8">
          <BlurFade delay={0}>
            <AnimatedGradientText className="text-6xl font-bold">
              Transform Your Property Management
            </AnimatedGradientText>
          </BlurFade>
          
          <BlurFade delay={0.3}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience the next generation of property management with AI-powered automation, 
              seamless tenant communication, and real-time insights.
            </p>
          </BlurFade>
          
          <BlurFade delay={0.6}>
            <div className="flex gap-4 justify-center items-center">
              <RainbowButton size="lg">
                <div className="i-lucide-crown w-5 h-5" />
                Start Free Trial
              </RainbowButton>
              <ShimmerButton className="px-8 py-4">
                Watch Demo
              </ShimmerButton>
              <InteractiveHoverButton className="px-6 py-3">
                Learn More
              </InteractiveHoverButton>
            </div>
          </BlurFade>
        </div>
        <Ripple mainCircleSize={250} mainCircleOpacity={0.2} numCircles={8} />
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <BlurFade delay={0.2}>
            <h2 className="text-3xl font-bold text-center mb-12">
              <AnimatedGradientText>Trusted by Property Managers Worldwide</AnimatedGradientText>
            </h2>
          </BlurFade>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: "i-lucide-users", label: "Active Users", value: 15000, suffix: "+" },
              { icon: "i-lucide-building", label: "Properties Managed", value: 50000, suffix: "+" },
              { icon: "i-lucide-dollar-sign", label: "Revenue Tracked", value: 2.4, suffix: "B" },
              { icon: "i-lucide-trending-up", label: "Efficiency Increase", value: 85, suffix: "%" },
            ].map((stat, index) => (
              <BlurFade key={stat.label} delay={0.4 + index * 0.1}>
                <div className="relative">
                  <Card className="text-center">
                    <CardContent className="pt-6">
                      <div className={`${stat.icon} w-8 h-8 mx-auto mb-2 text-primary`} />
                      <div className="text-3xl font-bold mb-1">
                        <NumberTicker value={stat.value} />
                        {stat.suffix}
                      </div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                  {index === 1 && <BorderBeam size={300} duration={12} delay={index * 0.5} />}
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <BlurFade delay={0.2}>
            <h2 className="text-3xl font-bold text-center mb-12">
              <AnimatedGradientText>Everything You Need</AnimatedGradientText>
            </h2>
          </BlurFade>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                title: "Smart Automation",
                description: "AI-powered workflows that handle routine tasks automatically",
                featured: true,
              },
              {
                title: "Tenant Portal",
                description: "Self-service portal for payments, requests, and communication",
                featured: false,
              },
              {
                title: "Financial Insights",
                description: "Real-time analytics and financial reporting",
                featured: false,
              },
            ].map((feature, index) => (
              <BlurFade key={feature.title} delay={0.4 + index * 0.2}>
                <div className="relative">
                  <Card className="h-full">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <CardTitle>{feature.title}</CardTitle>
                        {feature.featured && (
                          <Badge variant="secondary" className="ml-2">
                            <div className="i-lucide-star w-3 h-3 mr-1" />
                            Popular
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <InteractiveHoverButton className="w-full">
                        Explore Feature
                      </InteractiveHoverButton>
                    </CardContent>
                  </Card>
                  {feature.featured && <BorderBeam size={200} duration={15} />}
                </div>
              </BlurFade>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <BlurFade delay={0.2}>
            <h2 className="text-3xl font-bold text-center mb-12">
              <AnimatedGradientText>What Our Customers Say</AnimatedGradientText>
            </h2>
          </BlurFade>
          
          <BlurFade delay={0.4}>
            <Marquee className="py-4" pauseOnHover>
              {testimonials.map((testimonial, index) => (
                <TestimonialCard key={index} {...testimonial} />
              ))}
            </Marquee>
          </BlurFade>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          <BlurFade delay={0}>
            <AnimatedGradientText className="text-5xl font-bold">
              Ready to Get Started?
            </AnimatedGradientText>
          </BlurFade>
          
          <BlurFade delay={0.3}>
            <p className="text-xl text-muted-foreground">
              Join thousands of property managers who have transformed their operations
            </p>
          </BlurFade>
          
          <BlurFade delay={0.6}>
            <div className="flex gap-4 justify-center items-center">
              <RainbowButton size="lg" className="text-lg px-10 py-4">
                <div className="i-lucide-zap w-5 h-5" />
                Start Your Free Trial
              </RainbowButton>
              <ShimmerButton 
                className="px-8 py-4 text-lg" 
                shimmerColor="#a78bfa"
                background="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              >
                Schedule Demo
              </ShimmerButton>
            </div>
          </BlurFade>
        </div>
      </section>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete landing page demo showcasing all Magic UI components working together in a real-world TenantFlow context.',
      },
    },
  },
};

export const ComponentGallery: Story = {
  render: () => (
    <div className="p-8 space-y-12 max-w-6xl mx-auto">
      <div className="text-center space-y-4">
        <AnimatedGradientText className="text-4xl font-bold">
          Magic UI Component Gallery
        </AnimatedGradientText>
        <p className="text-muted-foreground">
          Interactive showcase of all available Magic UI components
        </p>
      </div>

      {/* Buttons Section */}
      <section className="space-y-6">
        <h3 className="text-2xl font-bold">Buttons</h3>
        <div className="flex flex-wrap gap-4">
          <RainbowButton>Rainbow Button</RainbowButton>
          <ShimmerButton>Shimmer Button</ShimmerButton>
          <InteractiveHoverButton>Interactive Hover</InteractiveHoverButton>
        </div>
      </section>

      {/* Effects Section */}
      <section className="space-y-6">
        <h3 className="text-2xl font-bold">Visual Effects</h3>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="relative">
            <Card className="h-40 flex items-center justify-center">
              <CardTitle>Border Beam Effect</CardTitle>
            </Card>
            <BorderBeam size={200} duration={10} />
          </div>
          
          <div className="relative h-40 rounded-lg border bg-background flex items-center justify-center overflow-hidden">
            <p className="z-10 text-lg font-semibold">Ripple Background</p>
            <Ripple mainCircleSize={120} mainCircleOpacity={0.15} numCircles={5} />
          </div>
        </div>
      </section>

      {/* Text Animations */}
      <section className="space-y-6">
        <h3 className="text-2xl font-bold">Text Animations</h3>
        <div className="space-y-4">
          <AnimatedGradientText className="text-3xl font-bold">
            Animated Gradient Text
          </AnimatedGradientText>
          <div className="flex items-center gap-4">
            <span>Revenue:</span>
            <NumberTicker value={2400000} className="text-2xl font-bold" />
          </div>
        </div>
      </section>

      {/* Layout Components */}
      <section className="space-y-6">
        <h3 className="text-2xl font-bold">Layout Components</h3>
        <div className="space-y-4">
          <Marquee className="border rounded-lg py-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <Badge key={i} variant="outline" className="mx-2">
                Feature {i + 1}
              </Badge>
            ))}
          </Marquee>
        </div>
      </section>

      {/* Blur Fade Animation Demo */}
      <section className="space-y-6">
        <h3 className="text-2xl font-bold">Blur Fade Animations</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <BlurFade key={i} delay={i * 0.1}>
              <Card>
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2">Item {i + 1}</h4>
                  <p className="text-sm text-muted-foreground">
                    This card appears with a {(i * 0.1).toFixed(1)}s delay
                  </p>
                </CardContent>
              </Card>
            </BlurFade>
          ))}
        </div>
      </section>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Comprehensive gallery showing all Magic UI components in organized sections.',
      },
    },
  },
};