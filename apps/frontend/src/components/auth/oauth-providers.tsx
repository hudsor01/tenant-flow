'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { signInWithGoogle } from '@/lib/clients/supabase-oauth'
import { toast } from 'sonner'
import { motion } from '@/lib/framer-motion'
import { cn } from '@/lib/utils'

interface OAuthProvidersProps {
  disabled?: boolean
  onProviderClick?: (provider: string) => void
}

export function OAuthProviders({ disabled = false, onProviderClick }: OAuthProvidersProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const handleGoogleLogin = async () => {
    if (disabled || isGoogleLoading) return
    
    onProviderClick?.('Google')
    setIsGoogleLoading(true)
    try {
      const result = await signInWithGoogle()
      if (!result.success) {
        toast.error(result.error || 'Failed to sign in with Google')
        setIsGoogleLoading(false)
      }
      // If successful, Supabase will redirect to the callback URL
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to sign in with Google'
      toast.error(message)
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Enhanced divider with modern styling */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border/50" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground font-medium">
            or continue with
          </span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Button
          type="button"
          variant="outline"
          className={cn(
            "group relative w-full h-12 text-base font-semibold border-2 transition-all duration-300 overflow-hidden",
            "bg-white hover:bg-gray-50/80 border-input hover:border-primary/30",
            "shadow-sm hover:shadow-lg hover:shadow-primary/10",
            "focus:border-primary focus:shadow-lg focus:shadow-primary/20",
            isGoogleLoading && "animate-pulse",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          onClick={handleGoogleLogin}
          disabled={disabled || isGoogleLoading}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Subtle background animation */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-50/30 via-green-50/30 to-red-50/30 opacity-0 group-hover:opacity-100"
            animate={{ 
              opacity: isHovered ? 0.5 : 0,
              scale: isHovered ? 1.05 : 1 
            }}
            transition={{ duration: 0.3 }}
          />
          
          <div className="relative flex items-center justify-center gap-3">
            <motion.div
              animate={{ 
                rotate: isGoogleLoading ? 360 : 0,
                scale: isHovered ? 1.1 : 1 
              }}
              transition={{ 
                rotate: { duration: 1, repeat: isGoogleLoading ? Infinity : 0, ease: "linear" },
                scale: { duration: 0.2 }
              }}
            >
              <svg
                className="h-5 w-5 flex-shrink-0"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            </motion.div>
            
            <motion.span 
              className="font-semibold text-foreground group-hover:text-primary transition-colors duration-200"
              animate={{ x: isHovered ? 2 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
            </motion.span>

            {/* Subtle loading indicator */}
            {isGoogleLoading && (
              <motion.div
                className="absolute right-4"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </motion.div>
            )}
          </div>

          {/* Enhanced shimmer effect */}
          <motion.div
            className="absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100"
            animate={{ x: isHovered ? "100%" : "-100%" }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </Button>
      </motion.div>

      {/* Trust indicator */}
      <motion.p 
        className="text-xs text-center text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        Secure authentication powered by Google
      </motion.p>
    </div>
  )
}