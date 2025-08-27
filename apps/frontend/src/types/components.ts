/**
 * Component types - NOW USING SHARED TYPES
 * All types moved to @repo/shared/types/ui for centralization
 */

// Use shared component prop types
export type {
	// Navigation Components
	NavigationLinkProps,
	NavigationGroupProps,
	BreadcrumbsProps,
	TabNavigationProps,
	MobileNavigationProps,

	// Maintenance Components  
	MaintenanceDetailProps,
	PrioritySelectorProps,
	UnitSelectorProps,
	CategorySelectorProps,

	// Invoice Components
	InvoiceDetailsProps,
	InvoiceActionsProps,
	InvoiceItem,
	InvoiceItemsSectionProps,
	ClientInfoSectionProps,

	// Auth Components
	AuthGuardProps,
	GoogleSignupButtonProps,

	// Domain Components
	PropertyCardProps,
	TenantCardProps,
	LeaseCardProps,

	// Blog Components
	BlogContentSectionProps,
	BlogSidebarProps,

	// SEO Components
	LocalBusinessSchemaProps,

	// Error Components
	ErrorBoundaryProps,

	// Security Components  
	SafeHTMLProps,

	// Common UI Components
	LoadingSkeletonProps,
	EmptyStateProps,

	// Base Props
	BaseProps,
	ModalProps,
	FormProps,
	TableProps,
	StatsCardProps
} from '@repo/shared'

