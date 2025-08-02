import { Button } from '@/components/ui/button'
import { Loader2, CreditCard, Shield } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils/css.utils'
import { useCheckout } from '@/hooks/useCheckout'

interface CustomerPortalButtonProps {
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  className?: string
  children?: React.ReactNode
  showSecurityBadge?: boolean
}

export function CustomerPortalButton({
  variant = 'outline',
  size = 'default',
  className,
  children = 'Manage Billing',
  showSecurityBadge = false
}: CustomerPortalButtonProps) {
  const { user } = useAuth()
  const { openPortal, isOpeningPortal, portalError } = useCheckout()

  const handlePortalAccess = async () => {
    if (!user?.id) {
      return
    }

    await openPortal()
  }

  return (
    <div className="space-y-3">
      {showSecurityBadge && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-2">
          <Shield className="w-4 h-4" />
          <span>Secure billing powered by Stripe</span>
        </div>
      )}
      
      <Button
        onClick={() => void handlePortalAccess()}
        disabled={isOpeningPortal || !user}
        variant={variant}
        size={size}
        className={cn(
          variant === 'default' && 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5',
          className
        )}
      >
        {isOpeningPortal ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Loading...
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4 mr-2" />
            {children}
          </>
        )}
      </Button>

      {portalError && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertDescription className="text-red-700">
            {portalError.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}