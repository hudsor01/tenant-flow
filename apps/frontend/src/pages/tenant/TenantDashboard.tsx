import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TenantDashboard() {
	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Tenant Portal</h1>
				<p className="text-muted-foreground mt-2">Welcome to your tenant dashboard</p>
			</div>
			
			<div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				<Card>
					<CardHeader>
						<CardTitle>Lease Information</CardTitle>
						<CardDescription>View your current lease details</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							Your lease information will appear here
						</p>
					</CardContent>
				</Card>
				
				<Card>
					<CardHeader>
						<CardTitle>Maintenance Requests</CardTitle>
						<CardDescription>Submit and track maintenance requests</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							No maintenance requests at this time
						</p>
					</CardContent>
				</Card>
				
				<Card>
					<CardHeader>
						<CardTitle>Documents</CardTitle>
						<CardDescription>Access your rental documents</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-muted-foreground">
							No documents available
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}