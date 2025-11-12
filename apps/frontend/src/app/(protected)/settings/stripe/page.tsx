import { StripeConnectStatus } from '../stripe-connect-onboarding'

export default function StripeConnectPage() {
       return (
	       <div className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
		       <div className="flex items-center justify-between">
			       <div>
				       <h1 className="text-3xl font-bold text-foreground">
					       Stripe Connect
				       </h1>
				       <p className="text-muted-foreground mt-1">
					       Connect your Stripe account to collect rent payments from tenants
				       </p>
			       </div>
		       </div>

		       <div className="max-w-3xl">
			       <StripeConnectStatus />
		       </div>

		       <div className="max-w-3xl space-y-4 mt-6">
			       <div className="rounded-lg border p-4 bg-muted/20">
				       <h3 className="font-semibold mb-2">How Stripe Connect Works</h3>
				       <ul className="text-sm text-muted-foreground space-y-2 ml-4 list-disc">
					       <li>Connect your Stripe account to enable online rent collection</li>
					       <li>Tenants pay rent directly through the tenant portal</li>
					       <li>Funds are deposited into your connected bank account</li>
					       <li>Automatic recurring payments with Stripe Subscriptions</li>
					       <li>Secure payment processing with industry-leading security</li>
				       </ul>
			       </div>

			       <div className="rounded-lg border p-4 bg-muted/20">
				       <h3 className="font-semibold mb-2">Payment Processing Fees</h3>
				       <p className="text-sm text-muted-foreground">
					       Stripe charges 2.9% + $0.30 per successful card charge. ACH bank transfers
					       are 0.8% capped at $5. These fees are deducted from the payment amount.
				       </p>
			       </div>

			       <div className="rounded-lg border p-4 bg-muted/20">
				       <h3 className="font-semibold mb-2">Onboarding Requirements</h3>
				       <ul className="text-sm text-muted-foreground space-y-2 ml-4 list-disc">
					       <li>Business or individual tax identification number</li>
					       <li>Bank account details for payouts</li>
					       <li>Identity verification (driver&apos;s license or passport)</li>
					       <li>Business address and contact information</li>
				       </ul>
			       </div>
		       </div>
	       </div>
       )
}
