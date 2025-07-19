import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

export default function GetStartedWizard() {
	const navigate = useNavigate()

	const handleGetStarted = () => {
		navigate({ to: '/properties' })
	}

	return (
		<div className="container mx-auto max-w-2xl py-8">
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-3xl">Welcome to TenantFlow</CardTitle>
					<CardDescription className="text-lg mt-2">
						Let's get you started with managing your properties
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="text-center">
						<p className="text-muted-foreground mb-6">
							Start by adding your first property to begin managing your rentals efficiently.
						</p>
						<Button size="lg" onClick={handleGetStarted}>
							Go to Properties
							<ArrowRight className="ml-2 h-4 w-4" />
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}