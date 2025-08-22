import { Button } from '@/components/ui/button'
import { Loader2, CreditCard, Shield } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils/css.utils'
import { useOpenPortal } from '@/hooks/useSubscriptionActions'

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
	const { mutate: openPortal, isPending: isOpeningPortal, error: portalError } = useOpenPortal()

	const handlePortalAccess = async () => {
		if (!user?.id) {
			return
		}

		openPortal()
	}

	return (
		<div className="space-y-3">
			{showSecurityBadge && (
				<div className="mb-2 flex items-center justify-center gap-2 text-sm text-gray-500">
					<Shield className="h-4 w-4" />
					<span>Secure billing powered by Stripe</span>
				</div>
			)}

			<Button
				onClick={() => void handlePortalAccess()}
				disabled={isOpeningPortal || !user}
				variant={variant}
				size={size}
				className={cn(
					variant === 'default' &&
						'from-primary border-0 bg-gradient-to-r to-indigo-600 text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg',
					className
				)}
			>
				{isOpeningPortal ? (
					<>
						<Loader2 className="mr-2 h-4 w-4 animate-spin" />
						Loading...
					</>
				) : (
					<>
						<CreditCard className="mr-2 h-4 w-4" />
						{children}
					</>
				)}
			</Button>

			{portalError && (
				<Alert
					variant="destructive"
					className="border-red-200 bg-red-50"
				>
					<AlertDescription className="text-red-700">
						{portalError.message}
					</AlertDescription>
				</Alert>
			)}
		</div>
	)
}
