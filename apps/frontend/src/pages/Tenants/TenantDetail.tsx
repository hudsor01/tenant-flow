import { motion } from 'framer-motion'
import { User, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTenantDetailData } from '@/hooks/useTenantDetailData'
import { useTenantActions } from '@/hooks/useTenantActions'
import { useParams, useNavigate } from '@tanstack/react-router'

/**
 * Tenant detail page component
 * Displays tenant information - simplified version
 */
export default function TenantDetail() {
	const { tenantId } = useParams({ from: "/_authenticated/tenants/$tenantId" })
	const navigate = useNavigate()
	
	// Get tenant data and handlers
	const { tenant, isLoading, error } = useTenantDetailData({ tenantId })
	const { handleSendEmail, handleCall } = useTenantActions({ tenant })

	const handleBackToTenants = () => {
		navigate({ to: '/tenants' })
	}

	if (isLoading) {
		return (
			<div className="animate-pulse space-y-6">
				<div className="flex items-center space-x-4">
					<div className="h-10 w-10 rounded bg-gray-200" />
					<div className="h-8 w-64 rounded bg-gray-200" />
				</div>
				<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
					{[...Array(3)].map((_, i) => (
						<div key={i} className="h-32 rounded-lg bg-gray-200" />
					))}
				</div>
			</div>
		)
	}

	if (error || !tenant) {
		return (
			<div className="flex min-h-[400px] flex-col items-center justify-center">
				<User className="text-muted-foreground mb-4 h-12 w-12" />
				<h3 className="text-lg font-semibold">Tenant not found</h3>
				<p className="text-muted-foreground mt-2">
					The tenant you're looking for doesn't exist.
				</p>
				<Button onClick={handleBackToTenants} className="mt-4">
					Back to Tenants
				</Button>
			</div>
		)
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<motion.div
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				className="flex items-center justify-between"
			>
				<div className="flex items-center space-x-4">
					<Button
						variant="ghost"
						size="icon"
						onClick={handleBackToTenants}
						className="shrink-0"
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<div>
						<h1 className="text-2xl font-bold">{tenant.name}</h1>
						<p className="text-muted-foreground">{tenant.email}</p>
					</div>
				</div>
				<div className="flex space-x-2">
					{tenant.email && (
						<Button
							variant="outline"
							onClick={() => handleSendEmail?.()}
						>
							Send Email
						</Button>
					)}
					{tenant.phone && (
						<Button
							variant="outline"
							onClick={() => handleCall?.()}
						>
							Call
						</Button>
					)}
				</div>
			</motion.div>

			{/* Basic Info Card */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
			>
				<Card>
					<CardHeader>
						<CardTitle>Tenant Information</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<p className="text-sm text-muted-foreground">Name</p>
							<p className="font-medium">{tenant.name}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Email</p>
							<p className="font-medium">{tenant.email || 'Not provided'}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Phone</p>
							<p className="font-medium">{tenant.phone || 'Not provided'}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Emergency Contact</p>
							<p className="font-medium">{tenant.emergencyContact || 'Not provided'}</p>
						</div>
						<div>
							<p className="text-sm text-muted-foreground">Status</p>
							<p className="font-medium capitalize">{tenant.invitationStatus.toLowerCase()}</p>
						</div>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	)
}