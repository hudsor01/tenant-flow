import { PageLayout } from '#components/layout/page-layout'
import type { Metadata } from 'next'
import Link from 'next/link'
import {
	Building,
	CreditCard,
	FileText,
	HelpCircle,
	Mail,
	Shield,
	UserCog,
	Wrench
} from 'lucide-react'

export const metadata: Metadata = {
	title: 'Support Center | TenantFlow',
	description:
		'Get help with TenantFlow property management. Find answers to common questions about payments, leases, maintenance, and account management.'
}

const supportCategories = [
	{
		icon: CreditCard,
		title: 'Payments & Rent',
		description:
			'Payment processing, autopay setup, failed payments, receipts, and refunds.',
		topics: [
			'Why did my payment fail?',
			'How do I set up autopay?',
			'Where are my payment receipts?',
			'How do I update my payment method?'
		]
	},
	{
		icon: FileText,
		title: 'Leases & Documents',
		description:
			'Lease creation, e-signatures, renewals, document templates, and DocuSeal integration.',
		topics: [
			'How do I create a new lease?',
			'How does e-signing work?',
			'Can I customize lease templates?',
			'How do I renew a lease?'
		]
	},
	{
		icon: Wrench,
		title: 'Maintenance Requests',
		description:
			'Submitting requests, tracking progress, vendor assignment, and resolution.',
		topics: [
			'How do I submit a maintenance request?',
			'How do I track my request status?',
			'How are vendors assigned?',
			'What counts as an emergency request?'
		]
	},
	{
		icon: Building,
		title: 'Properties & Units',
		description:
			'Adding properties, managing units, occupancy tracking, and property settings.',
		topics: [
			'How do I add a new property?',
			'How do I manage units?',
			'How is occupancy calculated?',
			'Can I deactivate a property?'
		]
	},
	{
		icon: UserCog,
		title: 'Account & Settings',
		description:
			'Profile management, notification preferences, password changes, and user roles.',
		topics: [
			'How do I change my password?',
			'How do I update my notification settings?',
			'What is the difference between Owner and Tenant roles?',
			'How do I invite a tenant?'
		]
	},
	{
		icon: Shield,
		title: 'Billing & Subscription',
		description:
			'Plans, pricing, Stripe Connect onboarding, payouts, and platform fees.',
		topics: [
			'How do I connect my Stripe account?',
			'How are platform fees calculated?',
			'When do I receive payouts?',
			'How do I change my subscription plan?'
		]
	}
]

export default function SupportPage() {
	return (
		<PageLayout>
			<div className="mx-auto max-w-5xl px-6 section-spacing page-offset-navbar">
				{/* Header */}
				<div className="text-center mb-16">
					<h1 className="typography-h1 mb-4">Support Center</h1>
					<p className="text-lg text-muted-foreground max-w-2xl mx-auto">
						Find answers to common questions or reach out to our support team.
						We are here to help you get the most out of TenantFlow.
					</p>
				</div>

				{/* Support Categories Grid */}
				<div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
					{supportCategories.map(category => (
						<div
							key={category.title}
							className="card-standard p-6 hover:border-primary/20 transition-colors"
						>
							<div className="flex items-start gap-4 mb-4">
								<div className="icon-container-sm bg-primary/10 text-primary shrink-0 mt-0.5">
									<category.icon className="size-4" />
								</div>
								<div>
									<h2 className="font-semibold text-foreground">
										{category.title}
									</h2>
									<p className="text-sm text-muted-foreground mt-1">
										{category.description}
									</p>
								</div>
							</div>
							<ul className="space-y-2 ml-1">
								{category.topics.map(topic => (
									<li
										key={topic}
										className="text-sm text-muted-foreground flex items-start gap-2"
									>
										<HelpCircle className="size-3.5 mt-0.5 shrink-0 text-muted-foreground/60" />
										{topic}
									</li>
								))}
							</ul>
						</div>
					))}
				</div>

				{/* Contact Support */}
				<div className="card-standard p-8 text-center">
					<Mail className="size-8 text-primary mx-auto mb-4" />
					<h2 className="typography-h3 mb-2">Need more help?</h2>
					<p className="text-muted-foreground mb-6 max-w-lg mx-auto">
						Our support team responds within 4 hours during business hours.
						Include your account email and a description of the issue for the
						fastest resolution.
					</p>
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
						<Link
							href="mailto:support@tenantflow.app"
							className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
						>
							<Mail className="size-4" />
							support@tenantflow.app
						</Link>
						<Link
							href="/faq"
							className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-border font-medium hover:bg-muted/50 transition-colors"
						>
							<HelpCircle className="size-4" />
							Browse FAQ
						</Link>
					</div>
				</div>
			</div>
		</PageLayout>
	)
}
