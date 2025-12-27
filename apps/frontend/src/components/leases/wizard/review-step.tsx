'use client'

/**
 * Lease Creation Wizard - Step 4: Review
 * Summary of all entered data before submission
 */
import { Badge } from '#components/ui/badge'
import { Separator } from '#components/ui/separator'
import { formatCents } from '#lib/formatters/currency'
import {
	CheckCircle2,
	Home,
	User,
	Calendar,
	DollarSign,
	PawPrint,
	Zap,
	FileText
} from 'lucide-react'
import type { LeaseWizardData } from '@repo/shared/validation/lease-wizard.schemas'

// Format cents to currency, returning '-' for null/undefined
const formatCentsOrDash = (cents?: number | null) =>
	typeof cents === 'number' ? formatCents(cents) : '-'

interface ReviewStepProps {
	data: Partial<LeaseWizardData>
	propertyName?: string | undefined
	unitNumber?: string | undefined
	tenantName?: string | undefined
}

export function ReviewStep({
	data,
	propertyName,
	unitNumber,
	tenantName
}: ReviewStepProps) {

	const formatDate = (dateStr: string | undefined) => {
		if (!dateStr) return '-'
		return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	}

	return (
		<div className="space-y-6">
			<div>
				<h3 className="typography-large mb-4">Review Lease Details</h3>
				<p className="text-muted-foreground text-sm mb-6">
					Please review all information before creating the draft lease.
				</p>
			</div>

			{/* Property & Tenant */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<Home className="h-4 w-4 text-muted-foreground" />
					<h4 className="font-medium">Property & Tenant</h4>
				</div>
				<div className="grid grid-cols-2 gap-4 pl-6">
					<div>
						<p className="text-sm text-muted-foreground">Property</p>
						<p className="font-medium">{propertyName || 'Not selected'}</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Unit</p>
						<p className="font-medium">{unitNumber || 'Not selected'}</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Tenant</p>
						<p className="font-medium">{tenantName || 'Not selected'}</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Governing State</p>
						<p className="font-medium">{data.governing_state || 'TX'}</p>
					</div>
				</div>
			</div>

			<Separator />

			{/* Lease Duration */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<Calendar className="h-4 w-4 text-muted-foreground" />
					<h4 className="font-medium">Lease Duration</h4>
				</div>
				<div className="grid grid-cols-2 gap-4 pl-6">
					<div>
						<p className="text-sm text-muted-foreground">Start Date</p>
						<p className="font-medium">{formatDate(data.start_date)}</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">End Date</p>
						<p className="font-medium">{formatDate(data.end_date)}</p>
					</div>
				</div>
			</div>

			<Separator />

			{/* Financial Terms */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<DollarSign className="h-4 w-4 text-muted-foreground" />
					<h4 className="font-medium">Financial Terms</h4>
				</div>
				<div className="grid grid-cols-3 gap-4 pl-6">
					<div>
						<p className="text-sm text-muted-foreground">Monthly Rent</p>
						<p className="font-medium text-lg">
							{formatCentsOrDash(data.rent_amount)}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Security Deposit</p>
						<p className="font-medium">
							{formatCentsOrDash(data.security_deposit)}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Rent Due Day</p>
						<p className="font-medium">
							{data.payment_day
								? `${data.payment_day}${getOrdinalSuffix(data.payment_day)} of month`
								: '-'}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Grace Period</p>
						<p className="font-medium">
							{data.grace_period_days !== undefined
								? `${data.grace_period_days} days`
								: '-'}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Late Fee</p>
						<p className="font-medium">
							{formatCentsOrDash(data.late_fee_amount)}
						</p>
					</div>
				</div>
			</div>

			<Separator />

			{/* Occupancy & Pets */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<User className="h-4 w-4 text-muted-foreground" />
					<h4 className="font-medium">Occupancy & Pets</h4>
				</div>
				<div className="grid grid-cols-2 gap-4 pl-6">
					<div>
						<p className="text-sm text-muted-foreground">Max Occupants</p>
						<p className="font-medium">
							{data.max_occupants || 'Not specified'}
						</p>
					</div>
					<div>
						<p className="text-sm text-muted-foreground">Pets</p>
						<div className="flex items-center gap-2">
							{data.pets_allowed ? (
								<>
									<Badge variant="outline" className="gap-1">
										<PawPrint className="h-3 w-3" />
										Allowed
									</Badge>
									{data.pet_deposit && (
										<span className="text-sm">
											Deposit: {formatCentsOrDash(data.pet_deposit)}
										</span>
									)}
									{data.pet_rent && (
										<span className="text-sm">
											Rent: {formatCentsOrDash(data.pet_rent)}/mo
										</span>
									)}
								</>
							) : (
								<Badge variant="secondary">Not Allowed</Badge>
							)}
						</div>
					</div>
				</div>
			</div>

			<Separator />

			{/* Utilities */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<Zap className="h-4 w-4 text-muted-foreground" />
					<h4 className="font-medium">Utilities</h4>
				</div>
				<div className="grid grid-cols-2 gap-4 pl-6">
					<div>
						<p className="text-sm text-muted-foreground mb-2">
							Included in Rent
						</p>
						<div className="flex flex-wrap gap-1">
							{data.utilities_included?.length ? (
								data.utilities_included.map(u => (
									<Badge key={u} variant="outline" className="capitalize">
										{u.replace('_', ' ')}
									</Badge>
								))
							) : (
								<span className="text-sm text-muted-foreground">None</span>
							)}
						</div>
					</div>
					<div>
						<p className="text-sm text-muted-foreground mb-2">
							Tenant Responsible
						</p>
						<div className="flex flex-wrap gap-1">
							{data.tenant_responsible_utilities?.length ? (
								data.tenant_responsible_utilities.map(u => (
									<Badge key={u} variant="secondary" className="capitalize">
										{u.replace('_', ' ')}
									</Badge>
								))
							) : (
								<span className="text-sm text-muted-foreground">None</span>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Property Rules */}
			{data.property_rules && (
				<>
					<Separator />
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<FileText className="h-4 w-4 text-muted-foreground" />
							<h4 className="font-medium">Property Rules</h4>
						</div>
						<p className="text-sm pl-6 whitespace-pre-wrap">
							{data.property_rules}
						</p>
					</div>
				</>
			)}

			{/* Lead Paint Disclosure */}
			{data.property_built_before_1978 && (
				<>
					<Separator />
					<div className="space-y-3">
						<div className="flex items-center gap-2">
							<CheckCircle2
								className={`h-4 w-4 ${
									data.lead_paint_disclosure_acknowledged
										? 'text-green-500'
										: 'text-amber-500'
								}`}
							/>
							<h4 className="font-medium">Lead Paint Disclosure</h4>
						</div>
						<div className="pl-6">
							{data.lead_paint_disclosure_acknowledged ? (
								<Badge variant="outline" className="text-green-600">
									Disclosure Acknowledged
								</Badge>
							) : (
								<Badge variant="destructive">Acknowledgment Required</Badge>
							)}
						</div>
					</div>
				</>
			)}
		</div>
	)
}

function getOrdinalSuffix(n: number): string {
	const s = ['th', 'st', 'nd', 'rd'] as const
	const v = n % 100
	return s[(v - 20) % 10] ?? s[v] ?? s[0] ?? 'th'
}
