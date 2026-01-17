'use client'

import { useState } from 'react'
import {
	AlertTriangle,
	Building2,
	ChevronDown,
	CreditCard,
	ExternalLink,
	FileText,
	RefreshCw,
	Shield,
	User
} from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger
} from '#components/ui/collapsible'
import { apiRequest } from '#lib/api-request'
import { cn } from '#lib/utils'

interface ConnectRequirementsProps {
	requirements: string[]
	deadline?: string | null
}

const REQUIREMENT_LABELS: Record<
	string,
	{ label: string; icon: typeof User; description: string }
> = {
	'individual.verification.document': {
		label: 'Identity verification',
		icon: User,
		description: 'Upload a government-issued ID'
	},
	'individual.verification.additional_document': {
		label: 'Additional ID verification',
		icon: FileText,
		description: 'Upload additional identity documents'
	},
	'company.verification.document': {
		label: 'Business verification',
		icon: Building2,
		description: 'Upload business registration documents'
	},
	external_account: {
		label: 'Bank account',
		icon: CreditCard,
		description: 'Add a bank account for payouts'
	},
	tos_acceptance: {
		label: 'Terms of service',
		icon: FileText,
		description: 'Accept the Stripe Connected Account Agreement'
	},
	'individual.address': {
		label: 'Personal address',
		icon: User,
		description: 'Provide your residential address'
	},
	'individual.dob': {
		label: 'Date of birth',
		icon: User,
		description: 'Provide your date of birth'
	},
	'individual.ssn_last_4': {
		label: 'SSN verification',
		icon: Shield,
		description: 'Provide the last 4 digits of your SSN'
	},
	'individual.phone': {
		label: 'Phone number',
		icon: User,
		description: 'Provide a valid phone number'
	},
	'individual.email': {
		label: 'Email address',
		icon: User,
		description: 'Provide a valid email address'
	},
	'business_profile.url': {
		label: 'Business website',
		icon: Building2,
		description: 'Provide your business website URL'
	},
	'business_profile.mcc': {
		label: 'Business category',
		icon: Building2,
		description: 'Select your business category'
	}
}

function getRequirementInfo(requirement: string) {
	// Check for exact match first
	if (REQUIREMENT_LABELS[requirement]) {
		return REQUIREMENT_LABELS[requirement]
	}

	// Check for partial match (some requirements have nested paths)
	for (const [key, value] of Object.entries(REQUIREMENT_LABELS)) {
		if (requirement.includes(key) || key.includes(requirement)) {
			return value
		}
	}

	// Default fallback
	return {
		label: requirement.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
		icon: FileText,
		description: 'Complete this requirement'
	}
}

export function ConnectRequirements({
	requirements,
	deadline
}: ConnectRequirementsProps) {
	const [isOpen, setIsOpen] = useState(requirements.length <= 3)
	const [isOpeningDashboard, setIsOpeningDashboard] = useState(false)

	const handleOpenDashboard = async () => {
		setIsOpeningDashboard(true)
		try {
			const response = await apiRequest<{
				success: boolean
				data: { url: string }
			}>('/api/v1/stripe/connect/dashboard-link', { method: 'POST' })
			if (response.data?.url) {
				window.open(response.data.url, '_blank')
			}
		} catch {
			toast.error('Failed to open Stripe Dashboard. Please try again.')
		} finally {
			setIsOpeningDashboard(false)
		}
	}

	const formattedDeadline = deadline
		? new Date(deadline).toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric'
			})
		: null

	if (requirements.length === 0) {
		return null
	}

	return (
		<div className="rounded-lg border border-warning/30 bg-warning/10 p-4">
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-start gap-3">
					<AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<p className="font-medium text-warning-foreground">
								Verification Required
							</p>
							<Badge variant="warning" className="text-xs">
								{requirements.length} item{requirements.length > 1 ? 's' : ''}{' '}
								needed
							</Badge>
						</div>
						{formattedDeadline && (
							<p className="mt-1 text-sm text-muted-foreground">
								Due by {formattedDeadline}
							</p>
						)}
					</div>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleOpenDashboard}
					disabled={isOpeningDashboard}
					className="shrink-0"
				>
					{isOpeningDashboard ? (
						<RefreshCw className="mr-2 size-4 animate-spin" />
					) : (
						<ExternalLink className="mr-2 size-4" />
					)}
					Complete in Stripe
				</Button>
			</div>

			<Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-4">
				{requirements.length > 3 && (
					<CollapsibleTrigger asChild>
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-between text-muted-foreground hover:text-foreground"
						>
							{isOpen ? 'Hide requirements' : 'Show all requirements'}
							<ChevronDown
								className={cn(
									'size-4 transition-transform',
									isOpen && 'rotate-180'
								)}
							/>
						</Button>
					</CollapsibleTrigger>
				)}

				<CollapsibleContent>
					<ul className="mt-2 space-y-2">
						{requirements.map((requirement) => {
							const info = getRequirementInfo(requirement)
							const Icon = info.icon

							return (
								<li
									key={requirement}
									className="flex items-start gap-3 rounded-md border bg-background/50 p-3"
								>
									<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning/20">
										<Icon className="size-4 text-warning" />
									</div>
									<div className="min-w-0">
										<p className="font-medium text-foreground">{info.label}</p>
										<p className="text-sm text-muted-foreground">
											{info.description}
										</p>
									</div>
								</li>
							)
						})}
					</ul>
				</CollapsibleContent>

				{/* Show first 3 when collapsed */}
				{!isOpen && requirements.length > 3 && (
					<ul className="mt-2 space-y-2">
						{requirements.slice(0, 3).map((requirement) => {
							const info = getRequirementInfo(requirement)
							const Icon = info.icon

							return (
								<li
									key={requirement}
									className="flex items-start gap-3 rounded-md border bg-background/50 p-3"
								>
									<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-warning/20">
										<Icon className="size-4 text-warning" />
									</div>
									<div className="min-w-0">
										<p className="font-medium text-foreground">{info.label}</p>
										<p className="text-sm text-muted-foreground">
											{info.description}
										</p>
									</div>
								</li>
							)
						})}
					</ul>
				)}
			</Collapsible>
		</div>
	)
}
