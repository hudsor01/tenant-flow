import { motion } from 'framer-motion'
import { CheckCircle, Users, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { useRouter } from '@tanstack/react-router'

interface TenantAlreadyAcceptedModalProps {
	isOpen: boolean
	onClose: () => void
	tenantName: string
	tenantEmail: string
}

export default function TenantAlreadyAcceptedModal({
	isOpen,
	onClose,
	tenantName,
	tenantEmail
}: TenantAlreadyAcceptedModalProps) {
	const router = useRouter()

	const handleGoToTenants = () => {
		router.navigate({ to: '/tenants' })
		onClose()
	}

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
						<CheckCircle className="h-8 w-8 text-green-600" />
					</div>
					<DialogTitle className="text-center text-xl font-bold">
						Tenant Already Accepted!
					</DialogTitle>
					<DialogDescription className="space-y-2 text-center">
						<p>
							<strong>{tenantName}</strong> ({tenantEmail}) has
							already accepted their invitation and is now an
							active tenant.
						</p>
					</DialogDescription>
				</DialogHeader>

				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="my-4 rounded-lg border border-blue-200 bg-blue-50 p-4"
				>
					<div className="flex items-start space-x-3">
						<Users className="mt-0.5 h-5 w-5 text-blue-600" />
						<div>
							<h4 className="font-medium text-blue-900">
								You can find them here:
							</h4>
							<p className="mt-1 text-sm text-blue-700">
								Go to <strong>Tenants</strong> in the sidebar to
								view their profile, lease details, and manage
								their account.
							</p>
						</div>
					</div>
				</motion.div>

				<DialogFooter className="flex space-x-3">
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						className="flex-1"
					>
						<X className="mr-2 h-4 w-4" />
						Close
					</Button>
					<Button
						type="button"
						onClick={handleGoToTenants}
						className="flex-1 bg-blue-600 hover:bg-blue-700"
					>
						<ArrowRight className="mr-2 h-4 w-4" />
						Go to Tenants
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
