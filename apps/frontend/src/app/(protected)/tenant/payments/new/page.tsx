'use client'

import { Button } from '#components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '#components/ui/select'

export default function OneTimePaymentPage() {
	return (
		<div className="container mx-auto max-w-2xl py-12">
			<Card>
				<CardHeader>
					<CardTitle>Make a One-Time Payment</CardTitle>
					<CardDescription>
						Enter the details for your one-time rent payment.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="amount">Payment Amount</Label>
						<Input id="amount" type="number" placeholder="Enter amount" />
					</div>
					<div className="space-y-2">
						<Label htmlFor="payment-method">Payment Method</Label>
						<Select>
							<SelectTrigger id="payment-method">
								<SelectValue placeholder="Select a payment method" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="card-1">Visa ending in 4242</SelectItem>
								<SelectItem value="bank-1">Chase ending in 1234</SelectItem>
								<SelectItem value="new">Add a new payment method</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="notes">Notes (Optional)</Label>
						<Input id="notes" placeholder="e.g., Early payment for next month" />
					</div>
				</CardContent>
				<CardFooter>
					<Button className="w-full">Submit Payment</Button>
				</CardFooter>
			</Card>
		</div>
	)
}
