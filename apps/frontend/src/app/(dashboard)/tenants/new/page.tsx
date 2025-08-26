import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, User } from 'lucide-react'
import Link from 'next/link'
import { TenantForm } from '@/components/forms/tenant-form'
import { PageTracker } from '@/components/analytics/page-tracker'
<<<<<<< HEAD
import type { Metadata } from 'next/types'
=======
import type { Metadata } from '@/types/next'
>>>>>>> origin/main

export const metadata: Metadata = {
	title: 'Add New Tenant | TenantFlow',
	description: 'Add a new tenant to your property management system'
}

function NewTenantHeader() {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center space-x-4">
				<Link href="/tenants">
					<Button variant="outline" size="sm">
						<ArrowLeft className="mr-2 h-4 w-4" />
						Back to Tenants
					</Button>
				</Link>
				<div className="space-y-1">
					<h1 className="text-2xl font-bold tracking-tight md:text-3xl">
						Add New Tenant
					</h1>
					<p className="text-muted-foreground">
						Create a new tenant profile for your property
					</p>
				</div>
			</div>
		</div>
	)
}

export default function NewTenantPage() {
	return (
		<div className="flex-1 space-y-6 p-4 md:p-6 lg:p-8">
			<PageTracker pageName="tenants-new" />
			<NewTenantHeader />

			<div className="mx-auto max-w-2xl">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<div className="bg-primary/10 rounded-lg p-2">
<<<<<<< HEAD
								<User className="text-primary h-5 w-5" />
=======
								<User className="h-5 w-5 text-primary" />
>>>>>>> origin/main
							</div>
							Tenant Information
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Suspense
							fallback={
								<div className="space-y-4">
									<div className="h-10 w-full animate-pulse rounded bg-gray-200" />
									<div className="h-10 w-full animate-pulse rounded bg-gray-200" />
									<div className="h-10 w-full animate-pulse rounded bg-gray-200" />
								</div>
							}
						>
<<<<<<< HEAD
							<TenantForm mode="create" />
=======
							<TenantForm
								mode="create"
								onSuccess={() => {
									// Redirect will be handled by the form component
								}}
							/>
>>>>>>> origin/main
						</Suspense>
					</CardContent>
				</Card>
			</div>
		</div>
	)
<<<<<<< HEAD
}
=======
}
>>>>>>> origin/main
