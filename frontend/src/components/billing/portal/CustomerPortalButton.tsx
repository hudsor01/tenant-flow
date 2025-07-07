import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CustomerPortalButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  children?: React.ReactNode
}

export function CustomerPortalButton({ 
  variant = 'outline',
  size = 'default',
  className,
  children = 'Manage Billing'
}: CustomerPortalButtonProps) {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePortalAccess = async () => {
    if (!user?.id) {
      setError('You must be logged in to access billing')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/v1/stripe/portal', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken || ''}`
        },
        body: JSON.stringify({ 
          userId: user.id 
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create portal session')
      }
      
      const { url } = await response.json()
      
      if (!url) {
        throw new Error('No portal URL received')
      }

      // Redirect to Stripe Customer Portal
      window.location.href = url
    } catch (error) {
      console.error('Portal access failed:', error)
      setError(
        error instanceof Error 
          ? error.message 
          : 'Failed to access billing portal'
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <Button 
        onClick={handlePortalAccess}
        disabled={isLoading || !user}
        variant={variant}
        size={size}
        className={className}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <ExternalLink className="w-4 h-4 mr-2" />
            {children}
          </>
        )}
      </Button>
      
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}