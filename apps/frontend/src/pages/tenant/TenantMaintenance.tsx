import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function TenantMaintenance() {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Maintenance Requests</h1>
					<p className="text-muted-foreground mt-2">Submit and track maintenance requests</p>
				</div>
				<Button>
					<Plus className="mr-2 h-4 w-4" />
					New Request
				</Button>
			</div>
			
			<Card>
				<CardHeader>
					<CardTitle>Your Requests</CardTitle>
					<CardDescription>Track the status of your maintenance requests</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-center py-8">
						<p className="text-muted-foreground">No maintenance requests submitted yet</p>
						<Button className="mt-4" variant="outline">
							Submit Your First Request
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}