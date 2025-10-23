'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { PaymentMethodsTab } from './payment-methods-tab'
import { StripeConnectTab } from './stripe-connect-tab'

export default function SettingsPage() {
	return (
		<div className="container mx-auto py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
					<span className="w-8 h-8" />
					Settings
				</h1>
				<p className="text-muted-foreground mt-2">
					Manage your account settings, payment methods, and integrations
				</p>
			</div>

			<Tabs defaultValue="payment-methods" className="space-y-6">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="payment-methods" className="flex items-center gap-2">
						Payment Methods
					</TabsTrigger>
					<TabsTrigger value="stripe-connect" className="flex items-center gap-2">
						Stripe Connect
					</TabsTrigger>
				</TabsList>

				<TabsContent value="payment-methods" className="space-y-6">
					<PaymentMethodsTab />
				</TabsContent>

				<TabsContent value="stripe-connect" className="space-y-6">
					<StripeConnectTab />
				</TabsContent>
			</Tabs>
		</div>
	)
}
