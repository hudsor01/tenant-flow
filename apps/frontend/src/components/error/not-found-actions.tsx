'use client'

import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

/**
 * NotFoundActions - Client component for interactive actions
 * Handles browser-specific functionality like going back in history
 */
export function NotFoundActions() {
  const handleGoBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      window.history.back()
    } else {
      // Fallback to homepage if no history
      window.location.href = '/'
    }
  }

  return (
    <Button
      onClick={handleGoBack}
      variant="outline"
      className="w-full flex items-center justify-center gap-2"
    >
      <ArrowLeft className="h-4 w-4" />
      Go Back
    </Button>
  )
}