'use client'

import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function ConfirmEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        {/* Apple-style glass card */}
        <div className="glass-apple p-8 text-center">
          {/* TenantFlow Logo */}
          <div className="flex justify-center mb-8">
            <div className="flex items-center gap-2">
              <div className="size-8 bg-primary rounded-lg flex items-center justify-center">
                <svg className="size-5 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h3a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1h3a1 1 0 001-1V7l-7-5z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-xl font-bold text-foreground">TenantFlow</span>
            </div>
          </div>

          {/* Email Icon with Apple-style elevation */}
          <div className="mx-auto flex items-center justify-center size-16 rounded-full bg-primary/10 mb-8 card-apple">
            <svg className="size-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 3.26a2 2 0 001.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          {/* Main Heading - Apple typography hierarchy */}
          <h1 className="text-3xl font-bold text-foreground mb-4 tracking-tight">
            Check Your Email
          </h1>

          {/* Subtitle with muted color */}
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            We've sent a confirmation link to your email address. Please check your inbox and click the link to verify your account.
          </p>
        </div>

        {/* Instructions Card with Apple glass effect */}
        <div className="glass-apple mt-6 p-6">
          <h2 className="font-semibold text-foreground mb-4 text-center">What's next?</h2>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 size-5 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">1</span>
              <span>Check your email inbox and spam folder</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 size-5 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">2</span>
              <span>Click the confirmation link in the email</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 size-5 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">3</span>
              <span>You'll be redirected to sign in to your account</span>
            </li>
          </ol>
        </div>

        {/* Action Buttons with Apple button styling */}
        <div className="mt-8 space-y-3">
          <p className="text-sm text-muted-foreground text-center mb-4">
            Didn't receive the email?
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              className="btn-apple btn-primary-apple flex-1"
              onClick={() => window.location.reload()}
            >
              Check Again
            </button>

            <Link
              href="/login"
              className="btn-apple btn-secondary-apple flex-1 text-center"
            >
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* Support Contact with subtle styling */}
        <div className="mt-8 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Need help? Contact our support team at{' '}
            <a
              href="mailto:support@tenantflow.app"
              className="text-primary apple-hover-lift transition-fast-color"
            >
              support@tenantflow.app
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}