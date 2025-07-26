import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Building, Users, FileText } from 'lucide-react'
import { motion } from 'framer-motion'

export default function GetStartedWizard() {
	const navigate = useNavigate()
	const [isNavigating, setIsNavigating] = useState(false)

	const handleGetStarted = async () => {
		setIsNavigating(true)
		// Add small delay for smooth UX transition
		await new Promise(resolve => setTimeout(resolve, 300))
		navigate({ to: '/properties' })
	}

	const features = [
		{
			icon: Building,
			title: 'Property Management',
			description: 'Add and manage your rental properties with ease'
		},
		{
			icon: Users,
			title: 'Tenant Portal',
			description: 'Give tenants access to payments and maintenance requests'
		},
		{
			icon: FileText,
			title: 'Lease Generation',
			description: 'Create state-compliant leases automatically'
		}
	]

	return (
		<div className="container mx-auto max-w-4xl py-8 px-4">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
			>
				<Card className="mb-8">
					<CardHeader className="text-center pb-8">
						<motion.div
							initial={{ opacity: 0, scale: 0.8 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ duration: 0.5, delay: 0.2 }}
						>
							<div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
								<Building className="h-8 w-8 text-primary" />
							</div>
							<CardTitle className="text-4xl font-bold">Welcome to TenantFlow</CardTitle>
							<CardDescription className="text-lg mt-3 max-w-2xl mx-auto">
								Streamline your property management with our comprehensive platform designed for modern landlords
							</CardDescription>
						</motion.div>
					</CardHeader>
					<CardContent className="space-y-8">
						{/* Features Grid */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
							{features.map((feature, index) => (
								<motion.div
									key={feature.title}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
									className="text-center p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
								>
									<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
										<feature.icon className="h-6 w-6 text-primary" />
									</div>
									<h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
									<p className="text-sm text-muted-foreground">{feature.description}</p>
								</motion.div>
							))}
						</div>

						{/* Call to Action */}
						<motion.div 
							className="text-center"
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.5, delay: 0.8 }}
						>
							<p className="text-muted-foreground mb-6 max-w-md mx-auto">
								Start by adding your first property to begin managing your rentals efficiently and accessing all platform features.
							</p>
							<Button 
								size="lg" 
								onClick={handleGetStarted}
								disabled={isNavigating}
								className="px-8 py-3 text-base font-semibold"
							>
								{isNavigating ? (
									<>
										<div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
										Getting Started...
									</>
								) : (
									<>
										Go to Properties
										<ArrowRight className="ml-2 h-4 w-4" />
									</>
								)}
							</Button>
						</motion.div>
					</CardContent>
				</Card>
			</motion.div>
		</div>
	)
}