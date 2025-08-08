'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { signInWithGoogle, signInWithGitHub } from '@/lib/actions/auth-actions'
import { toast } from 'sonner'

interface OAuthProvidersProps {
  disabled?: boolean
}

export function OAuthProviders({ disabled = false }: OAuthProvidersProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isGitHubLoading, setIsGitHubLoading] = useState(false)

  const handleGoogleLogin = async () => {
    if (disabled || isGoogleLoading) return
    
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
      // Server action will redirect, no need for additional handling
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in with Google'
      toast.error(message)
      setIsGoogleLoading(false)
    }
  }

  const handleGitHubLogin = async () => {
    if (disabled || isGitHubLoading) return
    
    setIsGitHubLoading(true)
    try {
      await signInWithGitHub()
      // Server action will redirect, no need for additional handling
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in with GitHub'
      toast.error(message)
      setIsGitHubLoading(false)
    }
  }

  const isLoading = isGoogleLoading || isGitHubLoading

  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="outline"
        className="w-full h-11"
        onClick={handleGoogleLogin}
        disabled={disabled || isLoading}
      >
        <svg
          className="mr-2 h-4 w-4"
          aria-hidden="true"
          focusable="false"
          data-prefix="fab"
          data-icon="google"
          role="img"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 488 512"
        >
          <path
            fill="currentColor"
            d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
          />
        </svg>
        {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
      </Button>

      <Button
        type="button"
        variant="outline"
        className="w-full h-11"
        onClick={handleGitHubLogin}
        disabled={disabled || isLoading}
      >
        <svg
          className="mr-2 h-4 w-4"
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
            clipRule="evenodd"
          />
        </svg>
        {isGitHubLoading ? 'Connecting...' : 'Continue with GitHub'}
      </Button>
    </div>
  )
}