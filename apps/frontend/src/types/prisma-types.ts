// Re-export actual database enum types for frontend use
// NOTE: Subscription fields use strings, not enums in the database

// Plan Type enum - 4-tier system
export enum PlanType {
	FREE = 'FREE',
	STARTER = 'STARTER',
	GROWTH = 'GROWTH',
	ENTERPRISE = 'ENTERPRISE'
}

// String literal types for subscription fields (not database enums)
export type SubscriptionStatus =
	| 'ACTIVE'
	| 'CANCELED'
	| 'TRIALING'
	| 'PAST_DUE'
	| 'INCOMPLETE'
	| 'INCOMPLETE_EXPIRED'
	| 'UNPAID'

// Subscription type based on actual Prisma model (database uses strings, not enums)
export interface PrismaSubscription {
	id: string
	userId: string
	status: string
	planId?: string | null
	billingPeriod?: string | null
	startDate: Date
	endDate?: Date | null
	cancelledAt?: Date | null
	createdAt: Date
	updatedAt: Date
	stripeCustomerId?: string | null
	stripeSubscriptionId?: string | null
	stripePriceId?: string | null
	currentPeriodStart?: Date | null
	currentPeriodEnd?: Date | null
	trialStart?: Date | null
	trialEnd?: Date | null
	cancelAtPeriodEnd?: boolean | null
	canceledAt?: Date | null
}
