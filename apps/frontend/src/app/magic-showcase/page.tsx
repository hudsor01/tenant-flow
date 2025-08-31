"use client"

import { ShimmerButton } from "@/components/magicui/shimmer-button"
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text"
import { NumberTicker } from "@/components/magicui/number-ticker"
import { BlurFade } from "@/components/magicui/blur-fade"
import { Meteors } from "@/components/magicui/meteors"
import { Marquee } from "@/components/magicui/marquee"

const reviews = [
  {
    name: "Jack",
    username: "@jack",
    body: "Amazing property management platform!",
  },
  {
    name: "Emily",
    username: "@emily",
    body: "TenantFlow has transformed how we manage our properties.",
  },
  {
    name: "Michael",
    username: "@michael",
    body: "The best solution for landlords and property managers.",
  },
  {
    name: "Sarah",
    username: "@sarah",
    body: "Intuitive, powerful, and reliable. Highly recommend!",
  },
  {
    name: "David",
    username: "@david",
    body: "Outstanding features and excellent support team.",
  },
]

export default function MagicShowcasePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black p-8">
      {/* Hero Section with Meteors Background */}
      <div className="relative overflow-hidden rounded-lg border border-gray-2 dark:border-gray-8 p-12 mb-12">
        <Meteors number={10} />
        
        <BlurFade delay={0.25} inView>
          <h1 className="text-5xl font-bold text-center mb-8">
            MagicUI Components with Hudson Digital Solutions
          </h1>
        </BlurFade>

        <BlurFade delay={0.5} inView>
          <div className="flex justify-center mb-8">
            <AnimatedGradientText>
              Built by Hudson Digital Solutions 
            </AnimatedGradientText>
          </div>
        </BlurFade>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <BlurFade delay={0.25} inView>
          <div className="text-center p-6 rounded-lg border border-gray-2 dark:border-gray-800">
            <div className="text-4xl font-bold">
              <NumberTicker value={1250} />+
            </div>
            <p className="text-gray-6 dark:text-gray-4 mt-2">Properties Managed</p>
          </div>
        </BlurFade>

        <BlurFade delay={0.5} inView>
          <div className="text-center p-6 rounded-lg border border-gray-2 dark:border-gray-800">
            <div className="text-4xl font-bold">
              <NumberTicker value={98.5} decimalPlaces={1} />%
            </div>
            <p className="text-gray-6 dark:text-gray-4 mt-2">Occupancy Rate</p>
          </div>
        </BlurFade>

        <BlurFade delay={0.75} inView>
          <div className="text-center p-6 rounded-lg border border-gray-2 dark:border-gray-800">
            <div className="text-4xl font-bold">
              $<NumberTicker value={2500000} />
            </div>
            <p className="text-gray-6 dark:text-gray-4 mt-2">Monthly Revenue</p>
          </div>
        </BlurFade>
      </div>

      {/* Buttons Section */}
      <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-12">
        <BlurFade delay={0.25} inView>
          <ShimmerButton className="shadow-2xl">
            <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight lg:text-lg">
              Get Started with TenantFlow
            </span>
          </ShimmerButton>
        </BlurFade>

        <BlurFade delay={0.5} inView>
          <ShimmerButton
            shimmerColor="#9c40ff"
            background="linear-gradient(110deg,#333 45%,#444 55%)"
            className="shadow-2xl"
          >
            <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight text-white lg:text-lg">
              View Demo
            </span>
          </ShimmerButton>
        </BlurFade>
      </div>

      {/* Testimonials Marquee */}
      <div className="mb-12">
        <BlurFade delay={0.25} inView>
          <h2 className="text-3xl font-bold text-center mb-8">What Our Users Say</h2>
        </BlurFade>
        
        <BlurFade delay={0.5} inView>
          <div className="relative flex h-[200px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-background">
            <Marquee pauseOnHover className="[--duration:20s]">
              {reviews.map((review) => (
                <div
                  key={review.username}
                  className="flex flex-col gap-2 p-4 mx-2 rounded-lg border bg-card min-w-[300px]"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {review.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{review.name}</p>
                      <p className="text-xs text-muted-foreground">{review.username}</p>
                    </div>
                  </div>
                  <p className="text-sm">{review.body}</p>
                </div>
              ))}
            </Marquee>
          </div>
        </BlurFade>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[
          "Property Management",
          "Tenant Portal",
          "Maintenance Tracking",
          "Financial Reports",
          "Document Storage",
          "Communication Hub",
        ].map((feature, i) => (
          <BlurFade key={feature} delay={0.25 + i * 0.1} inView>
            <div className="p-6 rounded-lg border border-gray-2 dark:border-gray-8 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold mb-2">{feature}</h3>
              <p className="text-gray-6 dark:text-gray-400">
                Streamline your {feature.toLowerCase()} with our powerful tools.
              </p>
            </div>
          </BlurFade>
        ))}
      </div>
    </div>
  )
}