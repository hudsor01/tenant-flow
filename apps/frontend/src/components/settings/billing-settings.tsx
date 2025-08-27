import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function BillingSettings() {
	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<i className="i-lucide-credit-card inline-block h-5 w-5"  />
						Billing & Subscription
					</CardTitle>
					<CardDescription>
						Manage your subscription and billing information.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid gap-4 md:grid-cols-2">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-lg">
									Current Plan
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<div className="flex items-center justify-between">
										<span className="font-medium">
											Premium
										</span>
										<Badge className="bg-green-500">
											Active
										</Badge>
									</div>
									<p className="text-muted-foreground text-sm">
										$29/month • Unlimited properties
									</p>
									<div className="text-muted-foreground flex items-center gap-2 text-sm">
										<i className="i-lucide-calendar inline-block h-3 w-3"  />
										Next billing: Jan 15, 2025
									</div>
								</div>
								<Button size="sm" className="w-full">
									Manage Plan
								</Button>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-3">
								<CardTitle className="text-lg">
									Payment Method
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="space-y-2">
									<div className="flex items-center gap-2">
										<i className="i-lucide-credit-card inline-block h-4 w-4"  />
										<span className="text-sm">
											**** **** **** 4242
										</span>
									</div>
									<p className="text-muted-foreground text-sm">
										Expires 12/26
									</p>
								</div>
								<Button
									size="sm"
									variant="outline"
									className="w-full"
								>
									Update Card
								</Button>
							</CardContent>
						</Card>
					</div>

					<Card>
						<CardHeader>
							<CardTitle className="text-lg">
								Recent Invoices
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div className="flex items-center justify-between rounded-lg border p-3">
									<div className="space-y-1">
										<p className="font-medium">
											December 2024
										</p>
										<p className="text-muted-foreground text-sm">
											Premium Plan
										</p>
									</div>
									<div className="flex items-center gap-2">
										<span className="font-medium">
											$29.00
										</span>
										<Button size="sm" variant="ghost">
											<i className="i-lucide-download inline-block h-4 w-4"  />
										</Button>
									</div>
								</div>
							</div>
						</CardContent>
					</Card>
				</CardContent>
			</Card>
		</div>
	)
}
