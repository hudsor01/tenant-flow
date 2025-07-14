import { Button } from '@/components/ui/button'
import { ExternalLink, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { trpc } from '@/lib/trpcClient'
import { toast } from 'sonner'

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

  const createPortalSession = trpc.subscriptions.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url
      } else {
        toast.error('No portal URL received')
      }
    },
    onError: (error) => {
      console.error('Portal access failed:', error)
      toast.error(error.message || 'Failed to access billing portal')
    }
  })

  const handlePortalAccess = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to access billing')
      return
    }

    createPortalSession.mutate({
      customerId: user.id,
      returnUrl: `${window.location.origin}/dashboard?portal=return`
    })
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handlePortalAccess}
        disabled={createPortalSession.isPending || !user}
        variant={variant}
        size={size}
        className={className}
      >
        {createPortalSession.isPending ? (
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

      {createPortalSession.error && (
        <Alert variant="destructive">
          <AlertDescription>{createPortalSession.error.message}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}