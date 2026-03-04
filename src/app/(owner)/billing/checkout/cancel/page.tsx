import type { Metadata } from 'next'
import Link from 'next/link'
import { XCircle } from 'lucide-react'

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
	title: 'Checkout Cancelled | TenantFlow',
	description: 'Your checkout was cancelled',
	robots: 'noindex, nofollow'
}

export default function CheckoutCancelPage() {
	return (
		<div className="container flex min-h-[60vh] items-center justify-center py-12">
			<Card className="w-full max-w-md text-center">
				<CardHeader className="pb-4">
					<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
						<XCircle className="size-8 text-muted-foreground" />
					</div>
					<CardTitle className="text-2xl">Checkout Cancelled</CardTitle>
					<CardDescription>
						Your checkout was cancelled. No charges were made.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-sm text-muted-foreground">
						If you experienced any issues or have questions, please don't
						hesitate to contact our support team.
					</p>
				</CardContent>
				<CardFooter className="flex flex-col gap-2">
					<Button asChild className="w-full">
						<Link href="/billing/plans">Try Again</Link>
					</Button>
					<Button asChild variant="outline" className="w-full">
						<Link href="/dashboard">Go to Dashboard</Link>
					</Button>
				</CardFooter>
			</Card>
		</div>
	)
}
