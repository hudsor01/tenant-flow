'use client'

import { useId } from 'react'
import type { Dispatch, InputHTMLAttributes, SetStateAction } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Checkbox } from '#components/ui/checkbox'
import { Input } from '#components/ui/input'
import { cn } from '#lib/utils'

export interface LeaseBuilderInputs {
	ownerName: string
	ownerAddress: string
	tenantNames: string
	propertyAddress: string
	rent_amount: string
	security_deposit: string
	rentDueDay: string
	leasestart_date: string
	leaseEndDate: string
	late_fee_amount: string
	gracePeriodDays: string
}

interface ConfigurationPanelProps {
	builderInputs: LeaseBuilderInputs
	onChange: Dispatch<SetStateAction<LeaseBuilderInputs>>
	includeStateDisclosures: boolean
	onToggleStateDisclosures: () => void
	includeFederalDisclosures: boolean
	onToggleFederalDisclosures: () => void
}

export function ConfigurationPanel({
	builderInputs,
	onChange,
	includeStateDisclosures,
	onToggleStateDisclosures,
	includeFederalDisclosures,
	onToggleFederalDisclosures
}: ConfigurationPanelProps) {
	return (
		<Card className="shadow-sm">
			<CardHeader>
				<CardTitle className="text-base">Lease Details</CardTitle>
				<CardDescription>
					Provide base information to personalize the clause text.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3 text-sm">
				<LabeledInput
					label="owner"
					value={builderInputs.ownerName}
					onChange={event =>
						onChange(prev => ({ ...prev, ownerName: event.target.value }))
					}
				/>
				<LabeledInput
					label="owner address"
					value={builderInputs.ownerAddress}
					onChange={event =>
						onChange(prev => ({ ...prev, ownerAddress: event.target.value }))
					}
				/>
				<LabeledInput
					label="Tenant names"
					helpText="Separate multiple tenants with semicolons"
					value={builderInputs.tenantNames}
					onChange={event =>
						onChange(prev => ({ ...prev, tenantNames: event.target.value }))
					}
				/>
				<LabeledInput
					label="Premises address"
					value={builderInputs.propertyAddress}
					onChange={event =>
						onChange(prev => ({ ...prev, propertyAddress: event.target.value }))
					}
				/>
				<div className="grid grid-cols-2 gap-3">
					<LabeledInput
						label="Rent (USD)"
						value={builderInputs.rent_amount}
						onChange={event =>
							onChange(prev => ({ ...prev, rent_amount: event.target.value }))
						}
					/>
					<LabeledInput
						label="Deposit (USD)"
						value={builderInputs.security_deposit}
						onChange={event =>
							onChange(prev => ({
								...prev,
								security_deposit: event.target.value
							}))
						}
					/>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<LabeledInput
						label="Rent due day"
						type="number"
						value={builderInputs.rentDueDay}
						onChange={event =>
							onChange(prev => ({ ...prev, rentDueDay: event.target.value }))
						}
					/>
					<LabeledInput
						label="Grace period (days)"
						type="number"
						value={builderInputs.gracePeriodDays}
						onChange={event =>
							onChange(prev => ({
								...prev,
								gracePeriodDays: event.target.value
							}))
						}
					/>
				</div>
				<div className="grid grid-cols-2 gap-3">
					<LabeledInput
						label="Lease start"
						type="date"
						value={builderInputs.leasestart_date}
						onChange={event =>
							onChange(prev => ({
								...prev,
								leasestart_date: event.target.value
							}))
						}
					/>
					<LabeledInput
						label="Lease end"
						type="date"
						value={builderInputs.leaseEndDate}
						onChange={event =>
							onChange(prev => ({ ...prev, leaseEndDate: event.target.value }))
						}
					/>
				</div>
				<LabeledInput
					label="Late fee (USD)"
					value={builderInputs.late_fee_amount}
					onChange={event =>
						onChange(prev => ({ ...prev, late_fee_amount: event.target.value }))
					}
				/>

				<div className="flex flex-col gap-2 pt-4">
					<label
						htmlFor="include-state-disclosures"
						className="flex items-center gap-2 typography-small"
					>
						<Checkbox
							id="include-state-disclosures"
							checked={includeStateDisclosures}
							onCheckedChange={onToggleStateDisclosures}
						/>
						Include state disclosures
					</label>
					<label
						htmlFor="include-federal-disclosures"
						className="flex items-center gap-2 typography-small"
					>
						<Checkbox
							id="include-federal-disclosures"
							checked={includeFederalDisclosures}
							onCheckedChange={onToggleFederalDisclosures}
						/>
						Include federal notices
					</label>
				</div>
			</CardContent>
		</Card>
	)
}

function LabeledInput(
	props: InputHTMLAttributes<HTMLInputElement> & {
		label: string
		helpText?: string
	}
) {
	const { label, helpText, ...inputProps } = props
	const id = useId()
	return (
		<div className="space-y-1 text-xs">
			<label htmlFor={id} className="font-medium text-muted-foreground">
				{label}
			</label>
			<Input
				id={id}
				{...inputProps}
				className={cn('h-9 text-sm', inputProps.className)}
			/>
			{helpText ? <p className="text-muted-foreground/80">{helpText}</p> : null}
		</div>
	)
}
