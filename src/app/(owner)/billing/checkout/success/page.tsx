import type { Metadata } from 'next'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'

export const metadata: Metadata = {
	title: 'Subscription Activated | TenantFlow',
	description: 'Your subscription is now active',
	robots: 'noindex, nofollow'
}

interface CheckoutSuccessPageProps {
	searchParams: Promise<{ session_id?: string }>
}

export default async function CheckoutSuccessPage({
	searchParams
}: CheckoutSuccessPageProps) {
	const { session_id } = await searchParams

	return (
		<div className="container flex min-h-[60vh] items-center justify-center py-12">
			<Card className="w-full max-w-md text-center">
				<CardHeader className="pb-4">
					<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/10">
						<CheckCircle2 className="size-8 text-success" />
					</div>
					<CardTitle className="text-2xl">Subscription Activated!</CardTitle>
					<CardDescription>
						Your subscription is now active and you have full access to all
						features.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						Thank you for subscribing to TenantFlow. You can manage your
						subscription at any time from your billing settings.
					</p>
					{session_id && (
						<p className="mt-4 text-xs text-muted-foreground">
							Session: {session_id.slice(0, 20)}...
						</p>
					)}
				</CardContent>
				<CardFooter className="flex flex-col gap-2">
					<Button asChild className="w-full">
						<Link href="/dashboard">Go to Dashboard</Link>
					</Button>
					<Button asChild variant="outline" className="w-full">
						<Link href="/billing/plans">View Plans</Link>
					</Button>
				</CardFooter>
			</Card>
		</div>
	)
}
