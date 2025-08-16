interface StripeFooterProps {
	className?: string
}

/**
 * Server component for Stripe attribution footer
 * Static content - no interactivity needed
 */
export function StripeFooter({ className }: StripeFooterProps) {
	return (
		<div className={`mt-12 text-center ${className || ''}`}>
			<p className="text-muted-foreground text-sm">
				Secure payments powered by{' '}
				<a
					href="https://stripe.com"
					target="_blank"
					rel="noopener noreferrer"
					className="text-primary font-semibold hover:underline"
				>
					Stripe
				</a>
			</p>
		</div>
	)
}
