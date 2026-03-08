import type { PaymentMethodResponse } from '#types/core'

function formatPaymentMethodDetails(pm: PaymentMethodResponse) {
	if (pm.type === 'card') {
		const brand = pm.brand || 'card'
		const displayName = brand.charAt(0).toUpperCase() + brand.slice(1)
		return {
			icon: `https://js.stripe.com/v3/fingerprinted/img/payment-methods/${brand}-dark.svg`,
			displayName,
			lastFour: `•••• ${pm.last4}`,
			expiryDate: null,
			description: `${displayName} ending in ${pm.last4}`,
			accessibleLabel: `${displayName} card ending in ${pm.last4}`,
			accountType: null
		}
	}

	if (pm.type === 'us_bank_account') {
		return {
			icon: 'https://js.stripe.com/v3/fingerprinted/img/payment-methods/ach-debit-dark.svg',
			displayName: 'Bank Account',
			lastFour: `•••• ${pm.last4}`,
			accountType: null,
			bankName: pm.bankName,
			expiryDate: null,
			description: pm.bankName
				? `${pm.bankName} ending in ${pm.last4}`.trim()
				: `Bank account ending in ${pm.last4}`,
			accessibleLabel: pm.bankName
				? `Bank account at ${pm.bankName} ending in ${pm.last4}`
				: `Bank account ending in ${pm.last4}`
		}
	}

	const typeStr = String(pm.type)
	const displayName = typeStr
		.split('_')
		.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
	return {
		icon: `https://js.stripe.com/v3/fingerprinted/img/payment-methods/${pm.type}-dark.svg`,
		displayName,
		description: displayName,
		accessibleLabel: `${displayName} payment method`,
		expiryDate: null,
		accountType: null
	}
}

export function PaymentMethodDisplay({ method }: { method: PaymentMethodResponse }) {
	const details = formatPaymentMethodDetails(method)

	return (
		<div className="flex items-center gap-3" role="img" aria-label={details.accessibleLabel}>
			<img
				src={details.icon}
				alt={`${details.displayName} icon`}
				className="size-6 object-contain"
				width="24"
				height="16"
				loading="lazy"
			/>
			<div className="flex flex-col gap-1 min-w-0 flex-1">
				<span className="font-medium text-sm truncate">{details.description}</span>
				<div className="flex items-center gap-2 text-caption">
					{details.expiryDate && <span>Expires {details.expiryDate}</span>}
					{details.accountType && <span>{details.accountType}</span>}
					{(details.expiryDate || details.accountType) && <span>•</span>}
					<span>Added {new Date(method.createdAt).toLocaleDateString()}</span>
				</div>
			</div>
			{method.isDefault && (
				<span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">
					Default
				</span>
			)}
		</div>
	)
}
