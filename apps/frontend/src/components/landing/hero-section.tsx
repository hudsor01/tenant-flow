/**
 * Hero Section - Server Component
 * Using native UnoCSS classes for consistent styling
 */

import { HeroButtons } from './hero-buttons'

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-background py-16 sm:py-20 lg:py-24">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-base2 via-background to-primary/5 op-30" />

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Announcement badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm text-muted-foreground shadow-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-success"></div>
            <span>🏢 Modern Property Management Platform</span>
            <i className="i-lucide-arrow-right h-3 w-3" />
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            <span className="block">Manage Properties,</span>
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Tenants & Leases
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-7 text-muted-foreground">
            Streamline your property portfolio with real-time occupancy tracking,
            maintenance management, and comprehensive analytics
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <HeroButtons />
            <button className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
              <i className="i-lucide-play h-4 w-4" />
              Watch Demo
            </button>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <i className="i-lucide-shield h-4 w-4 text-success" />
              <span>Enterprise Security</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="i-lucide-zap h-4 w-4 text-primary" />
              <span>Real-time Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <i className="i-lucide-users h-4 w-4 text-accent" />
              <span>Multi-tenant Ready</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
