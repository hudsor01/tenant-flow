/**
 * Premium Design System Showcase
 * Demonstrates all the premium components and their variants
 * Use this component to test and preview the design system
 */

"use client"

import * as React from 'react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './card'
import { Badge, StatusBadge, NotificationBadge } from './badge'
import { cn } from '@/lib/utils'
import { Heart, Star, Zap, Shield, Crown, Sparkles } from 'lucide-react'

export function DesignSystemShowcase() {
  return (
    <div className="container-premium py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-display-2xl gradient-text-hero">
          Premium Design System
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Modern SaaS components inspired by Linear, Stripe, and Notion. 
          Built with Tailwind CSS, Radix UI, and Glass Morphism effects.
        </p>
      </div>

      {/* Button Showcase */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-display-md mb-2">Premium Buttons</h2>
          <p className="text-muted-foreground">Interactive buttons with hover effects and variants</p>
        </div>
        
        <div className="grid gap-8">
          {/* Primary Buttons */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Primary & Brand Buttons</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="default">Default Button</Button>
              <Button variant="premium">Premium Button</Button>
              <Button variant="brand">Brand Button</Button>
              <Button variant="gradient">Gradient Button</Button>
            </div>
          </div>

          {/* Secondary Buttons */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Secondary & Utility Buttons</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="glass">Glass</Button>
              <Button variant="link">Link Button</Button>
            </div>
          </div>

          {/* Status Buttons */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Status Buttons</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="info">Info</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </div>

          {/* Button Sizes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Button Sizes</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Button size="xs">Extra Small</Button>
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
          </div>

          {/* Icon Buttons */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Icon Buttons</h3>
            <div className="flex flex-wrap gap-4 items-center">
              <Button size="icon" variant="default">
                <Heart className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="premium">
                <Star className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="brand">
                <Zap className="h-4 w-4" />
              </Button>
              <Button size="icon-lg" variant="gradient">
                <Crown className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Card Showcase */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-display-md mb-2">Premium Cards</h2>
          <p className="text-muted-foreground">Glass morphism cards with hover effects</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Default Card */}
          <Card variant="default">
            <CardHeader>
              <CardTitle>Default Card</CardTitle>
              <CardDescription>
                A standard card with subtle hover effects and glass morphism background.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This card demonstrates the default styling with backdrop blur and shadow effects.
              </p>
            </CardContent>
            <CardFooter>
              <Button size="sm">Learn More</Button>
            </CardFooter>
          </Card>

          {/* Premium Card */}
          <Card variant="premium">
            <CardHeader>
              <CardTitle gradient="brand">Premium Card</CardTitle>
              <CardDescription>
                Enhanced card with gradient accents and premium styling.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Features gradient borders, enhanced shadows, and smooth animations.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="premium" size="sm">
                <Crown className="h-3 w-3" />
                Upgrade
              </Button>
            </CardFooter>
          </Card>

          {/* Interactive Card */}
          <Card variant="interactive">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle gradient="brand">Interactive Card</CardTitle>
                <Badge variant="brand" size="sm">New</Badge>
              </div>
              <CardDescription>
                Clickable card with enhanced hover states and interactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for feature cards, pricing tiers, or interactive elements.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="brand" size="sm" className="w-full">
                <Sparkles className="h-3 w-3" />
                Explore Features
              </Button>
            </CardFooter>
          </Card>

          {/* Glass Card */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Glass Card</CardTitle>
              <CardDescription>
                Ultra-modern glass morphism effect with strong backdrop blur.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Subtle transparency with enhanced blur creates a floating effect.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="glass" size="sm">
                View Details
              </Button>
            </CardFooter>
          </Card>

          {/* Glow Card */}
          <Card variant="glass">
            <CardHeader>
              <CardTitle>Glow Card</CardTitle>
              <CardDescription>
                Eye-catching card with primary color glow effects.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Perfect for highlighting important content or call-to-action sections.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="gradient" size="sm">
                <Shield className="h-3 w-3" />
                Get Started
              </Button>
            </CardFooter>
          </Card>

          {/* Flat Card */}
          <Card variant="flat">
            <CardHeader>
              <CardTitle>Minimal Card</CardTitle>
              <CardDescription>
                Clean, minimal design for content-focused layouts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Simple styling perfect for articles, documentation, or clean interfaces.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">
                Read More
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Badge Showcase */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-display-md mb-2">Premium Badges</h2>
          <p className="text-muted-foreground">Status indicators, labels, and notification badges</p>
        </div>

        <div className="grid gap-8">
          {/* Standard Badges */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Standard Badges</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge variant="default">Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="ghost">Ghost</Badge>
            </div>
          </div>

          {/* Status Badges */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Status Badges</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <StatusBadge status="success">Active</StatusBadge>
              <StatusBadge status="warning">Pending</StatusBadge>
              <StatusBadge status="error">Failed</StatusBadge>
              <StatusBadge status="info">Info</StatusBadge>
              <StatusBadge status="inactive">Inactive</StatusBadge>
            </div>
          </div>

          {/* Premium Badges */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Premium Badges</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge variant="premium">Premium</Badge>
              <Badge variant="brand">Brand</Badge>
              <Badge variant="glass">Glass</Badge>
              <Badge variant="glow">Glow</Badge>
            </div>
          </div>

          {/* Badge Sizes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Badge Sizes</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge size="xs" variant="default">Extra Small</Badge>
              <Badge size="sm" variant="default">Small</Badge>
              <Badge size="default" variant="default">Default</Badge>
              <Badge size="lg" variant="default">Large</Badge>
              <Badge size="xl" variant="default">Extra Large</Badge>
            </div>
          </div>

          {/* Badge Shapes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Badge Shapes</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <Badge shape="default" variant="brand">Rounded</Badge>
              <Badge shape="square" variant="brand">Square</Badge>
              <Badge shape="pill" variant="brand">Pill</Badge>
            </div>
          </div>

          {/* Notification Badges */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Notification Badges</h3>
            <div className="flex flex-wrap gap-8 items-center">
              <div className="relative">
                <Button variant="outline" size="icon">
                  <Heart className="h-4 w-4" />
                </Button>
                <NotificationBadge count={3} />
              </div>
              <div className="relative">
                <Button variant="outline" size="icon">
                  <Star className="h-4 w-4" />
                </Button>
                <NotificationBadge count={99} />
              </div>
              <div className="relative">
                <Button variant="outline" size="icon">
                  <Zap className="h-4 w-4" />
                </Button>
                <NotificationBadge count={999} max={99} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Typography Showcase */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-display-md mb-2">Premium Typography</h2>
          <p className="text-muted-foreground">Modern typography scale with gradient effects</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-display-2xl">Display 2XL Heading</h1>
            <h2 className="text-display-xl">Display XL Heading</h2>
            <h3 className="text-display-lg">Display Large Heading</h3>
            <h4 className="text-display-md">Display Medium Heading</h4>
            <h5 className="text-display-sm">Display Small Heading</h5>
            <h6 className="text-display-xs">Display XS Heading</h6>
          </div>

          <div className="space-y-2">
            <p className="text-lg">Large body text for important content and descriptions.</p>
            <p className="text-base">Default body text for regular content and paragraphs.</p>
            <p className="text-sm text-muted-foreground">Small text for secondary information and labels.</p>
            <p className="text-xs text-muted-foreground">Extra small text for captions and metadata.</p>
          </div>

          <div className="space-y-2">
            <p className="gradient-text-hero text-2xl font-bold">Hero Gradient Text</p>
            <p className="gradient-text-brand text-xl font-semibold">Brand Gradient Text</p>
            <p className="gradient-text text-lg font-medium">Primary Gradient Text</p>
          </div>
        </div>
      </section>

      {/* Utility Classes Demo */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-display-md mb-2">Utility Classes</h2>
          <p className="text-muted-foreground">Glass effects, shadows, and animations</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass p-6 rounded-lg">
            <h3 className="font-semibold mb-2">Glass Effect</h3>
            <p className="text-sm text-muted-foreground">
              Subtle glass morphism with backdrop blur.
            </p>
          </div>

          <div className="glass-strong p-6 rounded-lg">
            <h3 className="font-semibold mb-2">Strong Glass</h3>
            <p className="text-sm text-muted-foreground">
              Enhanced glass effect with stronger blur.
            </p>
          </div>

          <div className="shadow-elevation-medium p-6 rounded-lg bg-card">
            <h3 className="font-semibold mb-2">Elevation Shadow</h3>
            <p className="text-sm text-muted-foreground">
              Medium elevation with depth shadows.
            </p>
          </div>

          <div className="shadow-glow p-6 rounded-lg bg-card">
            <h3 className="font-semibold mb-2">Glow Shadow</h3>
            <p className="text-sm text-muted-foreground">
              Primary color glow effect.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="interactive p-6 rounded-lg bg-card cursor-pointer">
            <h3 className="font-semibold mb-2">Interactive</h3>
            <p className="text-sm text-muted-foreground">
              Hover for scale and lift animation.
            </p>
          </div>

          <div className="animate-fade-in p-6 rounded-lg bg-card">
            <h3 className="font-semibold mb-2">Fade In</h3>
            <p className="text-sm text-muted-foreground">
              Entrance animation from bottom.
            </p>
          </div>

          <div className="animate-scale-in p-6 rounded-lg bg-card">
            <h3 className="font-semibold mb-2">Scale In</h3>
            <p className="text-sm text-muted-foreground">
              Scale entrance animation.
            </p>
          </div>

          <div className="animate-bounce-soft p-6 rounded-lg bg-card">
            <h3 className="font-semibold mb-2">Soft Bounce</h3>
            <p className="text-sm text-muted-foreground">
              Gentle bouncing animation.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}