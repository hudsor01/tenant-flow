'use client'

type Props = {
	planName?: string
	business?: { name: string; description?: string }
	amount: number
	currency: string
	formatAmountAction: (cents: number) => string
}

export function PlanSummary({
	planName,
	business,
	amount,
	formatAmountAction
}: Props) {
	return (
		<div className="bg-muted/30 rounded-xl p-4 border">
			<div className="flex items-center justify-between">
				<div className="text-left">
					{planName && <p className="font-semibold">{planName}</p>}
					<p className="body-sm text-muted-foreground">
						{business?.name}{' '}
						{business?.description && `• ${business.description}`}
					</p>
				</div>
				<div className="text-right">
					<p className="font-bold heading-sm text-primary">
						{formatAmountAction(amount)}
					</p>
					<p className="ui-caption text-muted-foreground">One-time payment</p>
				</div>
			</div>
		</div>
	)
}
