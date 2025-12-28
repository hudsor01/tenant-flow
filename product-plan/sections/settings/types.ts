// Settings Section Types

export interface SettingsProps {
	// Current user
	user: UserInfo

	// User preferences
	preferences: UserPreferences

	// Stripe Connect status
	stripeConnect: StripeConnectInfo

	// Platform subscription
	subscription: SubscriptionInfo

	// Company profile (for owners)
	companyProfile?: CompanyProfile

	// Callbacks
	onUpdateEmail: (newEmail: string) => void
	onChangePassword: (currentPassword: string, newPassword: string) => void
	onEnable2FA: () => void
	onDisable2FA: () => void
	onUpdateNotifications: (settings: NotificationSettings) => void
	onStartStripeOnboarding: () => void
	onResumeStripeOnboarding: () => void
	onUpdateCompanyProfile: (data: CompanyProfileData) => void
	onUpdatePaymentMethod: () => void
	onCancelSubscription: () => void
	onChangePlan: (planId: string) => void
	onUpdatePreferences: (preferences: Partial<UserPreferences>) => void
}

export interface UserInfo {
	id: string
	email: string
	fullName: string
	avatarUrl?: string
	userType: UserType
	twoFactorEnabled: boolean
	emailVerified: boolean
	lastPasswordChange?: string
}

export interface UserPreferences {
	theme: Theme
	language: string
	timezone: string
	notificationsEnabled: boolean
	emailNotifications: NotificationSettings
	pushNotifications: NotificationSettings
}

export interface NotificationSettings {
	paymentReceived: boolean
	paymentFailed: boolean
	leaseExpiring: boolean
	maintenanceUpdates: boolean
	newTenantSignup: boolean
	weeklyReport: boolean
}

export interface StripeConnectInfo {
	accountId?: string
	status: StripeConnectStatus
	chargesEnabled: boolean
	payoutsEnabled: boolean
	onboardingStatus: OnboardingStatus
	completionPercentage: number
	requirementsDue: string[]
	businessName?: string
	businessType?: string
}

export interface SubscriptionInfo {
	id?: string
	status: SubscriptionStatus
	planName: string
	planPrice: number
	billingInterval: 'month' | 'year'
	currentPeriodStart?: string
	currentPeriodEnd?: string
	trialEnd?: string
	paymentMethodLast4?: string
	paymentMethodBrand?: string
	billingHistory: BillingHistoryItem[]
}

export interface BillingHistoryItem {
	id: string
	amount: number
	status: PaymentStatus
	date: string
	invoiceUrl?: string
}

export interface CompanyProfile {
	businessName: string
	logoUrl?: string
	contactEmail?: string
	contactPhone?: string
	website?: string
	address?: string
}

export interface CompanyProfileData {
	businessName?: string
	logo?: File
	contactEmail?: string
	contactPhone?: string
	website?: string
	address?: string
}

export type UserType = 'owner' | 'tenant' | 'manager' | 'admin'
export type Theme = 'light' | 'dark' | 'system'
export type StripeConnectStatus =
	| 'not_connected'
	| 'pending'
	| 'active'
	| 'restricted'
export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed'
export type SubscriptionStatus =
	| 'active'
	| 'canceled'
	| 'past_due'
	| 'trialing'
	| 'none'
export type PaymentStatus = 'succeeded' | 'failed' | 'pending'
