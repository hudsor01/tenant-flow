/**
 * Auth Form Wrapper - Server Component
 * 
 * Optimized server component wrapper that minimizes client-side JavaScript
 * by handling static content and configuration on the server.
 * 
 * Features:
 * - Server-side configuration processing
 * - Static content rendering
 * - Client component hydration optimization
 * - Performance-first approach for React 19
 */

import React from 'react'
import { Sparkles, Shield, TrendingUp } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { AuthFormFactory } from './auth-form-factory'

interface AuthFormConfig {
  type: 'login' | 'signup' | 'forgot-password'
  title: string
  description: string
  submitLabel: string
  loadingLabel: string
  redirectTo?: string
  error?: string
}

interface AuthFormWrapperProps {
  config: AuthFormConfig
  showOAuth?: boolean
  showFeatures?: boolean
}

/**
 * Server Component: Renders static branding and layout
 * Only the form itself is a client component for optimal performance
 */
export async function AuthFormWrapper({ 
  config, 
  showOAuth: _showOAuth = true, 
  showFeatures = false 
}: AuthFormWrapperProps) {
  // Server-side configuration processing
  const features = [
    {
      icon: <Shield className="h-5 w-5" />,
      title: 'Secure & Reliable',
      description: 'Bank-level security for your property data'
    },
    {
      icon: <TrendingUp className="h-5 w-5" />,
      title: 'Boost Efficiency', 
      description: 'Streamline operations by up to 60%'
    },
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: 'Modern Interface',
      description: 'Intuitive design that just works'
    }
  ]

  return (
    <div className="from-background via-background to-muted/20 relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br py-8 px-4 md:px-8 lg:py-12 lg:px-12 xl:px-16">
      {/* Static background patterns - Server rendered */}
      <div className="from-primary/5 to-secondary/5 absolute inset-0 bg-gradient-to-br via-transparent" />
      <div className="from-primary/10 absolute top-0 right-0 h-64 w-64 rounded-full bg-gradient-to-bl to-transparent blur-3xl" />
      <div className="from-secondary/10 absolute bottom-0 left-0 h-48 w-48 rounded-full bg-gradient-to-tr to-transparent blur-3xl" />

      {/* Container for proper width constraints */}
      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Static Branding - Server rendered */}
        <div className="mb-10">
          <Link 
            href="/" 
            className="mb-8 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
          >
            <Image
              src="/tenant-flow-logo.png"
              alt="TenantFlow - Property Management"
              width={280}
              height={90}
              className="h-auto w-auto max-h-20 object-contain"
              priority
            />
          </Link>

          <div className="text-center">
            <h1 className="text-foreground mb-1 text-xl font-bold">
              {config.title}
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {config.description}
            </p>
          </div>
        </div>

        {/* Security badge for forgot password - Server rendered */}
        {config.type === 'forgot-password' && (
          <div className="mb-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            <span>Secure password reset</span>
          </div>
        )}

        {/* Client Component: Only the interactive form */}
        <AuthFormFactory 
          config={config}
        />

        {/* Optional Features - Server rendered */}
        {showFeatures && (
          <div className="mt-8 space-y-4">
            <div className="text-center text-sm font-medium text-muted-foreground">
              Trusted by property managers worldwide
            </div>
            <div className="grid grid-cols-1 gap-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                    {feature.icon}
                  </div>
                  <div>
                    <div className="font-medium text-foreground">{feature.title}</div>
                    <div className="text-xs">{feature.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthFormWrapper
