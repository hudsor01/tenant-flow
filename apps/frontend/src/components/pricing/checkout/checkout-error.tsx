"use client"


import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { animated } from '@react-spring/web'

type Props = {
  message: string
  onRetry: () => void
  spring: any
}

export function CheckoutError({ message, onRetry, spring }: Props) {
  return (
    <animated.div style={spring}>
      <div
        className={cn(
          'card-base',
          'w-full max-w-md mx-auto p-6 border-destructive/30 shadow-xl'
        )}
      >
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mx-auto animate-bounce">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h3 className="heading-md">Payment Setup Failed</h3>
            <p className="body-md text-muted-foreground">{message}</p>
          </div>
          <Button onClick={onRetry} className={cn('btn-primary', 'w-full transition-fast')} size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    </animated.div>
  )
}

