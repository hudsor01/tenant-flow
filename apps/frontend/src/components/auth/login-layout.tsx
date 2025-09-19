"use client"

import * as React from 'react'
import Image from "next/image"
import { Lock, Zap, Smartphone } from 'lucide-react'
import { LoginForm } from "./login-form"
import { 
  cn, 
  // cardClasses,
  ANIMATION_DURATIONS,
  TYPOGRAPHY_SCALE
} from '@/lib/utils'

interface LoginLayoutProps extends Omit<React.ComponentProps<'div'>, 'content' | 'onSubmit'> {
  mode?: 'login' | 'signup'
  onSubmit?: (data: Record<string, unknown>) => void | Promise<void>
  onForgotPassword?: () => void
  onSignUp?: () => void
  onLogin?: () => void
  onGoogleLogin?: () => void | Promise<void>
  onGoogleSignUp?: () => void | Promise<void>
  isLoading?: boolean
  isGoogleLoading?: boolean
  imageOnRight?: boolean
  imageUrl?: string
  title?: string
  subtitle?: string
  content?: {
    heading: string
    description: string
    stats: Array<{ value: string; label: string }>
  }
}

export const LoginLayout = React.forwardRef<HTMLDivElement, LoginLayoutProps>(
  ({ 
    mode = 'login',
    onSubmit: _onSubmit, 
    onForgotPassword: _onForgotPassword, 
    onSignUp: _onSignUp,
    onLogin: _onLogin, 
    onGoogleLogin: _onGoogleLogin,
    onGoogleSignUp: _onGoogleSignUp,
    isLoading: _isLoading = false,
    isGoogleLoading: _isGoogleLoading = false,
    imageOnRight = false,
    imageUrl = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
    title: _title = "Welcome Back",
    subtitle: _subtitle = "Sign in to your TenantFlow account to continue managing your properties",
    content = {
      heading: "Manage Your Properties",
      description: "Streamline tenant management, track maintenance, and maximize your real estate investments with TenantFlow's comprehensive platform.",
      stats: [
        { value: "500+", label: "Properties\nManaged" },
        { value: "10K+", label: "Happy\nTenants" },
        { value: "99.9%", label: "Platform\nUptime" }
      ]
    },
    className,
    ...divProps
  }, ref) => {
  const ImageSection = () => (
    <div className="relative hidden lg:flex lg:w-1/2 min-h-screen bg-background overflow-hidden">
        {/* High-res Real Estate Image */}
        <div className="w-full h-full min-h-screen relative flex">
          {/* Background Image with parallax effect */}
          <div className={cn("absolute inset-0 transform scale-105 ease-out", `transition-transform duration-[${ANIMATION_DURATIONS.slower}]`)}>
            <Image
              src={imageUrl}
              alt="Modern luxury apartment building"
              fill
              className={cn("object-cover ease-out", `transition-all duration-[${ANIMATION_DURATIONS.slow}]`)}
              priority
            />
          </div>
          {/* Strong dark overlay for maximum readability */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/85 via-background/80 to-black/85" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/40" />

          <div className="absolute inset-0 flex items-center justify-center">
            {/* Content container with dark glass background for maximum contrast */}
            <div className="relative max-w-lg mx-auto px-8">
              {/* Dark glass panel behind content for ultimate readability */}
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-3xl border border-white/10" />

              <div className={cn("relative text-center space-y-6 py-12 px-8 z-20 transform ease-out animate-in fade-in slide-in-from-bottom-8", `transition-all duration-[${ANIMATION_DURATIONS.slower}]`)}>
                {/* Enhanced Logo Icon with glow */}
                <div className="w-16 h-16 mx-auto mb-8 relative group">
                  <div className={cn("absolute inset-0 bg-gradient-to-r from-primary/30 to-primary/40 rounded-2xl blur-lg group-hover:blur-xl", `transition-all duration-[${ANIMATION_DURATIONS.slow}]`)} />
                  <div className={cn("relative w-full h-full bg-primary/90 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-primary/30 group-hover:border-primary/50 group-hover:scale-105", `transition-all duration-[${ANIMATION_DURATIONS.medium}]`)}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className={cn("w-8 h-8 text-white group-hover:scale-110", `transition-all duration-[${ANIMATION_DURATIONS.medium}]`)}
                    >
                      <path
                        d="M3 21L21 21M5 21V7L12 3L19 7V21M9 12H15M9 16H15"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </div>

                {/* High contrast heading */}
                <h2 className={cn("font-bold text-white drop-shadow-lg animate-in fade-in slide-in-from-bottom-4 delay-200", `duration-[${ANIMATION_DURATIONS.slow}]`)} style={{ fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize, fontWeight: TYPOGRAPHY_SCALE['heading-lg'].fontWeight, lineHeight: TYPOGRAPHY_SCALE['heading-lg'].lineHeight }}>
                  {content.heading}
                </h2>

                {/* High contrast description */}
                <p className={cn("text-white/95 max-w-md mx-auto leading-relaxed drop-shadow-md animate-in fade-in slide-in-from-bottom-4 delay-300", `duration-[${ANIMATION_DURATIONS.slow}]`)} style={{ fontSize: TYPOGRAPHY_SCALE['body-lg'].fontSize, lineHeight: TYPOGRAPHY_SCALE['body-lg'].lineHeight }}>
                  {content.description}
                </p>

                {/* High contrast stats grid */}
                <div className="grid grid-cols-3 gap-6 pt-6">
                  {content.stats.map((stat, index) => (
                    <div
                      key={index}
                      className={cn("text-center group animate-in fade-in slide-in-from-bottom-4", `duration-[${ANIMATION_DURATIONS.slow}]`)}
                      style={{animationDelay: `${400 + index * 100}ms`}}
                    >
                      <div className={cn("text-white mb-1 font-bold drop-shadow-md group-hover:scale-105", `transition-transform duration-[${ANIMATION_DURATIONS.default}]`)} style={{ fontSize: TYPOGRAPHY_SCALE['heading-md'].fontSize, fontWeight: TYPOGRAPHY_SCALE['heading-md'].fontWeight }}>
                        {stat.value}
                      </div>
                      <div
                        className={cn("text-white/90 leading-tight drop-shadow-sm group-hover:text-white", `transition-colors duration-[${ANIMATION_DURATIONS.default}]`)}
                        style={{ fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize, lineHeight: TYPOGRAPHY_SCALE['body-xs'].lineHeight }}
                        dangerouslySetInnerHTML={{__html: stat.label.replace('\n', '<br />')}}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Enhanced floating elements with smoother animations */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/30 rounded-full animate-pulse" 
               style={{animationDuration: '3s'}} />
          <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-white/40 rounded-full animate-pulse" 
               style={{animationDuration: '4s', animationDelay: '1s'}} />
          <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse" 
               style={{animationDuration: '2.5s', animationDelay: '0.5s'}} />
          <div className="absolute top-1/2 right-1/3 w-1 h-1 bg-white/20 rounded-full animate-pulse" 
               style={{animationDuration: '3.5s', animationDelay: '2s'}} />
        </div>
      </div>
  )

  const FormSection = () => (
    <div className="flex-1 lg:w-1/2 flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-background min-h-screen">
        <div className="w-full max-w-sm space-y-8">
          {/* Simple Logo/Brand with better spacing */}
          <div className="text-center space-y-4">
            <div className="w-14 h-14 mx-auto">
              <div className="w-full h-full bg-primary rounded-xl flex items-center justify-center shadow-sm">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-7 h-7 text-white"
                >
                  <path
                    d="M3 21L21 21M5 21V7L12 3L19 7V21M9 12H15M9 16H15"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                TenantFlow
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Professional Property Management Platform
              </p>
            </div>
          </div>

          {/* Auth Form with better spacing */}
          <div>
            {mode === 'login' ? (
              <LoginForm
                onSubmit={_onSubmit as (data: Record<string, unknown>) => void | Promise<void>}
                onForgotPassword={_onForgotPassword}
                onSignUp={_onSignUp}
                onGoogleLogin={_onGoogleLogin}
                isLoading={_isLoading}
                isGoogleLoading={_isGoogleLoading}
              />
            ) : (
              <LoginForm
                mode="signup"
                onSubmit={_onSubmit as (data: Record<string, unknown>) => void | Promise<void>}
                isLoading={_isLoading}
              />
            )}
          </div>

          {/* Refined Trust Indicators */}
          <div className="text-center space-y-4 pt-4 border-t border-border/50">
            <p className="text-muted-foreground/80 text-xs font-medium">
              Trusted by property managers worldwide
            </p>
            <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-6 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                <Lock className="w-3 h-3" />
                <span className="font-medium hidden sm:inline">Bank-level Security</span>
                <span className="font-medium sm:hidden">Secure</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                <Zap className="w-3 h-3" />
                <span className="font-medium">99.9% Uptime</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground/70 hover:text-muted-foreground transition-colors">
                <Smartphone className="w-3 h-3" />
                <span className="font-medium hidden sm:inline">Mobile Ready</span>
                <span className="font-medium sm:hidden">Mobile</span>
              </div>
            </div>
          </div>
        </div>
      </div>
  )

  return (
    <div ref={ref} className={cn("min-h-screen flex overflow-hidden bg-background", className)} {...divProps}>
      <div className="w-full flex">
        {imageOnRight ? (
          <>
            <FormSection />
            <ImageSection />
          </>
        ) : (
          <>
            <ImageSection />
            <FormSection />
          </>
        )}
      </div>
    </div>
  )
})
LoginLayout.displayName = 'LoginLayout'
