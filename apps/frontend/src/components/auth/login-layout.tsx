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
    <div className="relative hidden md:flex md:w-1/2 min-h-screen bg-slate-900 overflow-hidden">
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
          {/* Dynamic Overlay with depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-slate-800/70 to-slate-900/80 backdrop-blur-[0.5px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={cn("text-center text-white card-padding space-y-6 z-20 transform ease-out animate-in fade-in slide-in-from-bottom-8", `transition-all duration-[${ANIMATION_DURATIONS.slower}]`)}>
              {/* Enhanced Logo Icon with glow */}
              <div className="w-16 h-16 mx-auto mb-8 relative group">
                <div className={cn("absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/30 rounded-2xl blur-lg group-hover:blur-xl", `transition-all duration-[${ANIMATION_DURATIONS.slow}]`)} />
                <div className={cn("relative w-full h-full bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 group-hover:border-white/30 group-hover:scale-105", `transition-all duration-[${ANIMATION_DURATIONS.medium}]`)}>
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
              
              {/* Enhanced heading with animation */}
              <h2 className={cn("font-bold text-white animate-in fade-in slide-in-from-bottom-4 delay-200", `duration-[${ANIMATION_DURATIONS.slow}]`)} style={{ fontSize: TYPOGRAPHY_SCALE['heading-lg'].fontSize, fontWeight: TYPOGRAPHY_SCALE['heading-lg'].fontWeight, lineHeight: TYPOGRAPHY_SCALE['heading-lg'].lineHeight }}>
                {content.heading}
              </h2>
              
              {/* Enhanced description */}
              <p className={cn("text-white/80 max-w-md leading-relaxed animate-in fade-in slide-in-from-bottom-4 delay-300", `duration-[${ANIMATION_DURATIONS.slow}]`)} style={{ fontSize: TYPOGRAPHY_SCALE['body-lg'].fontSize, lineHeight: TYPOGRAPHY_SCALE['body-lg'].lineHeight }}>
                {content.description}
              </p>
              
              {/* Enhanced stats grid with stagger animation */}
              <div className="grid grid-cols-3 gap-6 pt-6">
                {content.stats.map((stat, index) => (
                  <div 
                    key={index} 
                    className={cn("text-center group animate-in fade-in slide-in-from-bottom-4", `duration-[${ANIMATION_DURATIONS.slow}]`)}
                    style={{animationDelay: `${400 + index * 100}ms`}}
                  >
                    <div className={cn("text-white mb-1 font-bold group-hover:scale-105", `transition-transform duration-[${ANIMATION_DURATIONS.default}]`)} style={{ fontSize: TYPOGRAPHY_SCALE['heading-md'].fontSize, fontWeight: TYPOGRAPHY_SCALE['heading-md'].fontWeight }}>
                      {stat.value}
                    </div>
                    <div 
                      className={cn("text-white/70 leading-tight group-hover:text-white/90", `transition-colors duration-[${ANIMATION_DURATIONS.default}]`)}
                      style={{ fontSize: TYPOGRAPHY_SCALE['body-xs'].fontSize, lineHeight: TYPOGRAPHY_SCALE['body-xs'].lineHeight }}
                      dangerouslySetInnerHTML={{__html: stat.label.replace('\n', '<br />')}} 
                    />
                  </div>
                ))}
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
    <div className="flex-1 md:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-background">
        <div className="w-full max-w-md space-y-6">
          {/* Simple Logo/Brand */}
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto mb-6">
              <div className="w-full h-full bg-primary rounded-xl flex items-center justify-center">
                <svg 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-6 h-6 text-white"
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
            
            <h1 className="text-2xl font-bold text-foreground">
              TenantFlow
            </h1>
            <p className="text-muted-foreground text-sm">
              Professional Property Management Platform
            </p>
          </div>

          {/* Auth Form */}
          <div className="pt-6">
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

          {/* Simple Trust Indicators */}
          <div className="text-center space-y-4 pt-6 border-t border-border">
            <p className="text-muted-foreground text-xs font-medium">
              Trusted by property managers worldwide
            </p>
            <div className="flex items-center justify-center flex-wrap gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground/60">
                <Lock className="w-3 h-3" />
                Bank-level Security
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground/60">
                <Zap className="w-3 h-3" />
                99.9% Uptime
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground/60">
                <Smartphone className="w-3 h-3" />
                Mobile Ready
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
