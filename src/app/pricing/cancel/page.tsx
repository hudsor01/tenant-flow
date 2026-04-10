import type { Metadata } from 'next'

import { PageLayout } from '#components/layout/page-layout'
import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import { createPageMetadata } from '#lib/seo/page-metadata'
import { ArrowLeft, Home, MessageCircle, XCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = createPageMetadata({
	title: 'Checkout Cancelled',
	description: 'Your TenantFlow checkout was cancelled. No payment was processed.',
	path: '/pricing/cancel',
	noindex: true
})

export default function CheckoutCancelPage() {
	return (
		<PageLayout>
			<div className="mx-auto max-w-2xl px-6 section-content lg:px-8">
				<CardLayout
					title="Checkout cancelled"
					description="No worries — your payment was cancelled and you haven't been charged."
					className="text-center"
				>
					<div className="flex flex-col items-center gap-6 pb-4">
						<div className="flex-center size-16 rounded-full bg-muted/50">
							<XCircle
								className="size-8 text-muted-foreground"
								aria-hidden="true"
							/>
						</div>
					</div>

					<div className="space-y-6">
						<div className="rounded-lg bg-muted/50 p-6 text-left">
							<h3 className="mb-4 font-semibold text-foreground">
								What happened?
							</h3>
							<ul className="space-y-2 text-muted-foreground">
								<li>You cancelled the checkout process</li>
								<li>No payment was processed</li>
								<li>Your account remains unchanged</li>
								<li>You can try again anytime</li>
							</ul>
						</div>

						<div className="space-y-4">
							<h3 className="font-semibold text-foreground">
								Ready to get started?
							</h3>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<Link href="/pricing">
									<Button className="w-full" size="lg">
										<ArrowLeft className="mr-2 size-4" />
										Back to Pricing
									</Button>
								</Link>
								<Link href="/dashboard">
									<Button variant="outline" className="w-full" size="lg">
										<Home className="mr-2 size-4" />
										Go to Dashboard
									</Button>
								</Link>
							</div>
						</div>

						<div className="border-t pt-6">
							<p className="mb-4 text-muted-foreground">
								Still have questions about our pricing or need help choosing
								the right plan?
							</p>
							<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
								<Link href="/contact">
									<Button variant="outline" size="sm">
										<MessageCircle className="mr-2 size-4" />
										Contact Support
									</Button>
								</Link>
								<Link href="/features">
									<Button variant="ghost" size="sm">
										View Features
									</Button>
								</Link>
							</div>
						</div>
					</div>
				</CardLayout>
			</div>
		</PageLayout>
	)
}
