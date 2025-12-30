'use client'

import {
	leaseTemplateSchema
} from '@repo/shared/templates/lease-template'
import type { USState } from '@repo/shared/types/lease-generator.types'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'

interface StateRuleSummaryProps {
	state: USState
}

export function StateRuleSummary({ state }: StateRuleSummaryProps) {
	const rules = leaseTemplateSchema.stateRules[state]
	if (!rules) return null

	return (
		<Card className="shadow-sm">
			<CardHeader>
				<CardTitle className="text-base">
					{rules.stateName} Highlights
				</CardTitle>
				<CardDescription>
					Automatic notes drawn from TenantFlow's compliance library.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2 text-xs">
				<ul className="list-disc space-y-2 pl-4">
					{rules.notices.map(notice => (
						<li key={notice}>{notice}</li>
					))}
				</ul>
			</CardContent>
		</Card>
	)
}
