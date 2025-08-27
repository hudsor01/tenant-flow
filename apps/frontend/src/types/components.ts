/**
 * Component types - NOW USING SHARED TYPES
 * All types moved to @repo/shared/types/ui for centralization
 */

// Use shared component prop types that actually exist
export type {
	// Navigation Components (available in shared)
	NavigationLinkProps,
	NavigationGroupProps,
	BreadcrumbsProps,
	TabNavigationProps,
	MobileNavigationProps,

	// Maintenance Components (available in shared)
	MaintenanceDetailProps,
	PrioritySelectorProps,
	UnitSelectorProps,
	CategorySelectorProps,

	// Invoice Components (available in shared)
	InvoiceDetailsProps,
	InvoiceActionsProps,
	InvoiceItem,
	InvoiceItemsSectionProps,
	ClientInfoSectionProps,

	// Auth Components (available in shared)
	AuthGuardProps,
	GoogleSignupButtonProps,

	// Domain Components (available in shared)
	PropertyCardProps,
	TenantCardProps,
	LeaseCardProps,

	// Blog Components (available in shared)
	BlogContentSectionProps,
	BlogSidebarProps,

	// SEO Components (available in shared)
	LocalBusinessSchemaProps,

	// Error Components (available in shared)
	ErrorBoundaryProps,

	// Security Components (available in shared)
	SafeHTMLProps,

	// Common UI Components (available in shared)
	LoadingSkeletonProps,
	EmptyStateProps,

	// Base Props (available in shared)
	BaseProps,
	ModalProps,
	FormProps,
	TableProps,
	StatsCardProps
} from '@repo/shared'

