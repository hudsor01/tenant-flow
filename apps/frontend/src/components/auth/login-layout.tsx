"use client"

import * as React from 'react'
import Image from "next/image"
import { Lock, Zap, Smartphone } from 'lucide-react'
import { LoginForm } from "./login-form"
import { SignUpForm } from "./sign-up-form"
import { cn } from '@/lib/utils'

interface LoginLayoutProps extends Omit<React.ComponentProps<'div'>, 'content'> {
  mode?: 'login' | 'signup'
  onSubmit?: (data: any) => void | Promise<void>
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
    onSubmit, 
    onForgotPassword, 
    onSignUp,
    onLogin, 
    onGoogleLogin,
    onGoogleSignUp,
    isLoading = false,
    isGoogleLoading = false,
    imageOnRight = false,
    imageUrl = "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2340&q=80",
    title = "Welcome Back",
    subtitle = "Sign in to your TenantFlow account to continue managing your properties",
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
    ...props
  }, ref) => {
  const ImageSection = () => (
    <div className="relative hidden md:flex md:w-1/2 min-h-screen bg-slate-900">
        {/* High-res Real Estate Image */}
        <div className="w-full h-full min-h-screen relative flex">
          {/* Background Image */}
          <Image
            src={imageUrl}
            alt="Modern luxury apartment building"
            fill
            className="object-cover"
            priority
          />
          {/* Overlay for text readability */}
          <div className="absolute inset-0 bg-slate-900/60 bg-gradient-to-br from-slate-900/70 via-blue-900/50 to-slate-800/70" />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white p-8 space-y-4 z-20">
              {/* Logo Icon */}
              <div className="w-16 h-16 mx-auto mb-6 relative">
                <div className="w-full h-full bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
                  <svg 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-8 h-8 text-white"
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
              <h2 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-100 bg-clip-text text-transparent">
                {content.heading}
              </h2>
              <p className="text-lg text-white/80 max-w-md leading-relaxed">
                {content.description}
              </p>
              <div className="grid grid-cols-3 gap-6 pt-6">
                {content.stats.map((stat, index) => (
                  <div key={index} className="text-center">
                    <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-xs text-white/70 leading-tight" dangerouslySetInnerHTML={{__html: stat.label.replace('\n', '<br />')}} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Floating Elements for Visual Interest */}
          <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/30 rounded-full animate-pulse" />
          <div className="absolute top-2/3 right-1/4 w-1 h-1 bg-white/40 rounded-full animate-pulse delay-1000" />
          <div className="absolute bottom-1/3 left-1/3 w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse delay-500" />
        </div>
      </div>
  )

  const FormSection = () => (
    <div className="flex-1 md:w-1/2 flex items-center justify-center p-4 sm:p-8 lg:p-12 bg-gray-50/50">
        <div className="w-full max-w-md space-y-6 sm:space-y-8">
          {/* Logo/Brand */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto mb-4 relative">
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gradient-dominance">
              {title}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {subtitle}
            </p>
          </div>

          {/* Auth Form */}
          {mode === 'login' ? (
            <LoginForm
              className="space-y-6"
              onSubmit={onSubmit}
              onForgotPassword={onForgotPassword}
              onSignUp={onSignUp}
              onGoogleLogin={onGoogleLogin}
              isLoading={isLoading}
              isGoogleLoading={isGoogleLoading}
            />
          ) : (
            <SignUpForm
              className="space-y-6"
              onSubmit={onSubmit}
              onLogin={onLogin}
              onGoogleSignUp={onGoogleSignUp}
            />
          )}

          {/* Trust Indicators */}
          <div className="text-center space-y-4 pt-6 sm:pt-8 border-t">
            <p className="text-xs sm:text-sm text-muted-foreground">
              Trusted by property managers worldwide
            </p>
            <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-6 opacity-60">
              <div className="flex items-center gap-1 text-xs font-medium">
                <Lock className="w-3 h-3" />
                Bank-level Security
              </div>
              <div className="flex items-center gap-1 text-xs font-medium">
                <Zap className="w-3 h-3" />
                99.9% Uptime
              </div>
              <div className="flex items-center gap-1 text-xs font-medium">
                <Smartphone className="w-3 h-3" />
                Mobile Ready
              </div>
            </div>
          </div>
        </div>
      </div>
  )

  return (
    <div ref={ref} className={cn("min-h-screen flex overflow-hidden", className)} {...props}>
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
  )
})
LoginLayout.displayName = 'LoginLayout'