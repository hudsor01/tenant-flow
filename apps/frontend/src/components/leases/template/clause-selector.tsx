'use client'

import * as React from 'react'
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
import { Badge } from '#components/ui/badge'
import { Checkbox } from '#components/ui/checkbox'
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger
} from '#components/ui/tooltip'
import { Info } from 'lucide-react'
import { cn } from '#lib/utils'

interface ClauseSelectorProps {
	selectedClauses: string[]
	onToggleClause: (id: string) => void
	recommendedClauses: Set<string>
	state: USState
}

export function ClauseSelector({
	selectedClauses,
	onToggleClause,
	recommendedClauses,
	state
}: ClauseSelectorProps) {
	return (
		<Card className="shadow-sm">
			<CardHeader>
				<CardTitle className="text-base">Clause Library</CardTitle>
				<CardDescription>
					Choose the clauses to include. Recommended clauses for {state} are
					highlighted.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				{leaseTemplateSchema.sections.map(section => (
					<div key={section.id} className="space-y-3">
						<div>
							<h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
								{section.title}
							</h3>
							<p className="text-caption">{section.description}</p>
						</div>
						<div className="space-y-2">
							{section.clauses.map(clause => {
								const selected = selectedClauses.includes(clause.id)
								const recommended = recommendedClauses.has(clause.id)
								return (
									<div
										key={clause.id}
										className={cn(
											'rounded-lg border p-3 transition-colors',
											selected ? 'border-primary bg-primary/5' : 'border-border'
										)}
									>
										<div className="flex items-start justify-between gap-2">
											<label
												className="flex flex-1 cursor-pointer items-start gap-3 text-sm"
												htmlFor={clause.id}
											>
												<Checkbox
													id={clause.id}
													checked={selected}
													onCheckedChange={() => onToggleClause(clause.id)}
												/>
												<span>
													<span className="font-medium text-foreground flex items-center gap-2">
														{clause.title}
														{recommended && (
															<Badge variant="secondary">Recommended</Badge>
														)}
													</span>
													<span className="text-caption">
														{clause.description}
													</span>
												</span>
											</label>
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														type="button"
														className="text-muted-foreground"
													>
														<Info className="size-4" />
													</button>
												</TooltipTrigger>
												<TooltipContent className="max-w-xs text-xs">
													{clause.tooltip}
												</TooltipContent>
											</Tooltip>
										</div>
									</div>
								)
							})}
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	)
}
