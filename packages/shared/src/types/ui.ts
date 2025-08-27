/**
 * UI COMPONENT TYPES - All React component props and UI-related interfaces
 * CONSOLIDATED from 150+ scattered Props interfaces across frontend
 */

// Use generic type instead of React-specific ReactNode for better compatibility
// This allows the shared package to work in non-React environments (like backend)
type ReactNode = string | number | boolean | null | undefined | ReactNode[] | { [key: string]: unknown }

// =============================================================================
// COMMON UI PATTERNS - BASE PROPS
// =============================================================================

export interface BaseProps {
  className?: string
  children?: ReactNode
}

export interface ModalProps extends BaseProps {
  isOpen: boolean
  onClose: () => void
  title?: string
}

export interface FormProps extends BaseProps {
  onSubmit: (data: Record<string, unknown>) => void
  isLoading?: boolean
  error?: string
}

export interface TableProps<T = Record<string, unknown>> extends BaseProps {
  data: T[]
  columns: Array<{ key: string; label: string; render?: (value: unknown, item: T) => ReactNode }>
  isLoading?: boolean
  error?: string
}

export interface StatsCardProps extends BaseProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon?: ReactNode
}

// =============================================================================
// STRIPE COMPONENT PROPS - CONSOLIDATED from frontend Stripe forms  
// =============================================================================

export interface EnhancedElementsProviderProps extends BaseProps {
	clientSecret?: string
	appearance?: 'default' | 'minimal' | 'night'
	currency?: string
	amount?: number
	mode?: 'payment' | 'setup' | 'subscription'
	customerOptions?: {
		customer?: string
		ephemeralKey?: string
	}
}

// =============================================================================
// CHART COMPONENT PROPS - CONSOLIDATED from frontend charts
// =============================================================================

export interface ChartDataPoint {
	x: number | string
	y: number
	label?: string
	color?: string
}

export interface MiniBarChartProps extends BaseProps {
	data: {
		name: string
		value: number
		color?: string
	}[]
	height?: number
	width?: string | number
	showTooltip?: boolean
	barRadius?: number
	spacing?: number
}

export interface SparklineProps extends BaseProps {
	data: {
		value: number
		date?: string
	}[]
	color?: string
	height?: number
	showTooltip?: boolean
}

export interface LineChartProps extends BaseProps {
	data: ChartDataPoint[]
	xLabel?: string
	yLabel?: string
	title?: string
	height?: number
	width?: number
	showGrid?: boolean
	showLegend?: boolean
}

export interface BarChartProps extends BaseProps {
	data: ChartDataPoint[]
	xLabel?: string
	yLabel?: string
	title?: string
	height?: number
	width?: number
	orientation?: 'horizontal' | 'vertical'
	showGrid?: boolean
	showLegend?: boolean
}

export interface PieChartProps extends BaseProps {
	data: {
		name: string
		value: number
		color?: string
	}[]
	title?: string
	height?: number
	width?: number
	showLabel?: boolean
	showLegend?: boolean
}

export interface AreaChartProps extends BaseProps {
	data: ChartDataPoint[]
	xLabel?: string
	yLabel?: string
	title?: string
	height?: number
	width?: number
	fillColor?: string
	strokeColor?: string
	showGrid?: boolean
	showLegend?: boolean
}

export interface CustomTooltipProps {
	active?: boolean
	payload?: {
		value: number
		dataKey: string
		name?: string
		color?: string
	}[]
	label?: string
}

// =============================================================================
// MODAL COMPONENT PROPS - CONSOLIDATED from frontend modals
// =============================================================================

export interface BaseModalProps {
	isOpen: boolean
	onClose: () => void
	title?: string
	description?: string
}

export interface UpgradePromptModalProps extends BaseModalProps {
	action: string
	reason: string
	currentPlan: string
	suggestedPlan?: string
}

export interface BaseFormModalProps extends BaseModalProps {
	children: ReactNode
	onSubmit?: () => void | Promise<void>
	submitLabel?: string
	cancelLabel?: string
	isLoading?: boolean
	maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export interface EmailModalProps extends BaseModalProps {
	recipientEmail?: string
	subject?: string
	body?: string
	attachments?: File[]
	onSend: (data: EmailData) => void | Promise<void>
}

export interface EmailData {
	to: string
	subject: string
	body: string
	attachments?: File[]
}

export interface ConfirmationModalProps extends BaseModalProps {
	message: string
	confirmLabel?: string
	cancelLabel?: string
	onConfirm: () => void | Promise<void>
	variant?: 'default' | 'danger' | 'warning'
}

export interface FormModalProps<T = unknown> extends BaseModalProps {
	formData?: T
	onSubmit: (data: T) => void | Promise<void>
	fields: FormField[]
	validationRules?: Record<string, unknown>
}

export interface FormField {
	name: string
	label: string
	type:
		| 'text'
		| 'email'
		| 'password'
		| 'number'
		| 'textarea'
		| 'select'
		| 'checkbox'
	placeholder?: string
	required?: boolean
	options?: { value: string; label: string }[]
	defaultValue?: string | number | boolean
}

// Form field props for React components
export interface FormFieldProps {
	name: string
	label?: string
	placeholder?: string
	type?: string
	required?: boolean
	disabled?: boolean
	error?: string | string[]
	touched?: boolean
	value?: unknown
	onChange?: (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => void
	onBlur?: (
		e: React.FocusEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>
	) => void
}

// =============================================================================
// LAYOUT COMPONENT PROPS
// =============================================================================

export interface AuthLayoutProps extends BaseProps {
  showBackButton?: boolean
}

export interface DashboardLayoutProps extends BaseProps {
  sidebar?: ReactNode
}

export interface SidebarProps extends BaseProps {
  isCollapsed?: boolean
  onToggle?: () => void
}

export interface NavigationProps extends BaseProps {
  items: NavigationItem[]
}

export interface NavigationItem {
  label: string
  href: string
  icon?: ReactNode
  active?: boolean
  disabled?: boolean
}

// =============================================================================
// AUTH COMPONENT PROPS
// =============================================================================

export interface AuthGuardProps extends BaseProps {
  requireAuth?: boolean
  redirectTo?: string
}

export interface LoginPageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export interface AuthErrorProps extends BaseProps {
  error: string
  onRetry?: () => void
}

export interface OAuthProvidersProps extends BaseProps {
  onSuccess?: () => void
  onError?: (error: string) => void
}

// =============================================================================
// FORM COMPONENT PROPS
// =============================================================================

export interface ContactFormProps extends BaseProps {
  onSuccess?: () => void
}

export interface PropertyFormProps extends FormProps {
  initialData?: Record<string, unknown>
  onSuccess?: (property: Record<string, unknown>) => void
}

export interface TenantFormProps extends FormProps {
  initialData?: Record<string, unknown>
  onSuccess?: (tenant: Record<string, unknown>) => void
}

export interface LeaseFormProps extends FormProps {
  initialData?: Record<string, unknown>
  onSuccess?: (lease: Record<string, unknown>) => void
}

export interface MaintenanceFormProps extends FormProps {
  initialData?: Record<string, unknown>
  onSuccess?: (request: Record<string, unknown>) => void
}

export interface UnitFormProps extends FormProps {
  initialData?: Record<string, unknown>
  onSuccess?: (unit: Record<string, unknown>) => void
}

// =============================================================================
// DATA TABLE COMPONENT PROPS
// =============================================================================

export interface DataTableProps<TData, _TValue = unknown> extends BaseProps {
  columns: Array<{ key: string; label: string; render?: (value: unknown, item: TData) => ReactNode }>
  data: TData[]
  pageSize?: number
  searchKey?: string
  loading?: boolean
}

export interface PropertiesDataTableProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export interface TenantsDataTableProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export interface LeasesDataTableProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export interface UnitsDataTableProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export interface MaintenanceDataTableProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

// =============================================================================
// STATS COMPONENT PROPS
// =============================================================================

export interface PropertiesStatsProps extends BaseProps {
  data?: Record<string, unknown>
  isLoading?: boolean
}

export interface TenantsStatsProps extends BaseProps {
  data?: Record<string, unknown>
  isLoading?: boolean
}

export interface LeasesStatsProps extends BaseProps {
  data?: Record<string, unknown>
  isLoading?: boolean
}

export interface UnitsStatsProps extends BaseProps {
  data?: Record<string, unknown>
  isLoading?: boolean
}

export interface MaintenanceStatsProps extends BaseProps {
  data?: Record<string, unknown>
  isLoading?: boolean
}

// =============================================================================
// BILLING COMPONENT PROPS
// =============================================================================

export interface BillingLayoutProps extends BaseProps {
  currentPlan?: string
}

export interface CheckoutButtonProps extends BaseProps {
  priceId: string
  onSuccess?: () => void
}

export interface CheckoutFormProps extends BaseProps {
  clientSecret?: string
  onSuccess?: () => void
}

export interface PaymentMethodsProps extends BaseProps {
  methods: Record<string, unknown>[]
  onSelect?: (method: Record<string, unknown>) => void
}

export interface PricingTableProps extends BaseProps {
  plans: Record<string, unknown>[]
  currentPlan?: string
}

// =============================================================================
// DASHBOARD COMPONENT PROPS
// =============================================================================

export interface DashboardMetricsProps extends BaseProps {
  data?: Record<string, unknown>
  isLoading?: boolean
}

export interface DashboardHeaderProps extends BaseProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export interface DashboardSidebarProps extends BaseProps {
  isCollapsed?: boolean
}

export interface DashboardQuickActionsProps extends BaseProps {
  actions: Array<{
    label: string
    href: string
    icon: ReactNode
  }>
}

export interface DashboardActivityFeedProps extends BaseProps {
  activities: Record<string, unknown>[]
  isLoading?: boolean
}

// =============================================================================
// MAINTENANCE COMPONENT PROPS
// =============================================================================

export interface PrioritySelectorProps extends BaseProps {
  value?: string
  onValueChange: (value: string) => void
  error?: string
}

export interface MaintenanceDetailProps extends BaseProps {
  request: Record<string, unknown>
  onUpdate?: (data: Record<string, unknown>) => void
}

export interface MaintenanceStatusUpdateProps extends BaseProps {
  requestId: string
  currentStatus: string
  onUpdate?: (status: string) => void
}

export interface UnitSelectorProps extends BaseProps {
  propertyId?: string
  value?: string
  onValueChange: (value: string) => void
  error?: string
}

// =============================================================================
// ANALYTICS COMPONENT PROPS
// =============================================================================

export interface PageTrackerProps extends BaseProps {
  pageName: string
  properties?: Record<string, unknown>
}

export interface DashboardTrackerProps extends BaseProps {
  userId?: string
}

export interface TrackButtonProps extends BaseProps {
  eventName: string
  properties?: Record<string, unknown>
  onClick?: () => void
}

// =============================================================================
// DOMAIN COMPONENT PROPS - CONSOLIDATED from frontend components.ts
// =============================================================================

export interface PropertyCardProps {
  property: Record<string, unknown>
  onClick?: (property: Record<string, unknown>) => void
  onEdit?: (property: Record<string, unknown>) => void
  onDelete?: (id: string) => void
  isLoading?: boolean
  variant?: 'default' | 'compact' | 'detailed'
}

export interface TenantCardProps {
  tenant: Record<string, unknown>
  onClick?: (tenant: Record<string, unknown>) => void
  onEdit?: (tenant: Record<string, unknown>) => void
  onDelete?: (id: string) => void
  isLoading?: boolean
}

export interface LeaseCardProps {
  lease: Record<string, unknown>
  onClick?: (lease: Record<string, unknown>) => void
  onEdit?: (lease: Record<string, unknown>) => void
  onDelete?: (id: string) => void
  isLoading?: boolean
}

export interface CategorySelectorProps {
  value: string
  onChange: (category: string) => void
  disabled?: boolean
  placeholder?: string
}

// =============================================================================
// INVOICE COMPONENT PROPS - CONSOLIDATED from frontend components.ts
// =============================================================================

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

export interface InvoiceDetailsProps {
  invoice: Record<string, unknown>
  onEdit?: (invoice: Record<string, unknown>) => void
  onDelete?: (id: string) => void
  isLoading?: boolean
}

export interface InvoiceActionsProps {
  invoiceId: string
  onDownload?: () => void
  onEmail?: () => void
  onPrint?: () => void
  onDelete?: () => void
  isLoading?: boolean
}

export interface InvoiceItemsSectionProps {
  items: {
    description: string
    quantity: number
    rate: number
    amount: number
  }[]
  currency?: string
  editable?: boolean
  onChange?: (items: InvoiceItem[]) => void
}

export interface ClientInfoSectionProps {
  client: {
    name: string
    email: string
    phone?: string
    address?: string
  }
  editable?: boolean
  onChange?: (client: ClientInfoSectionProps['client']) => void
}

// =============================================================================
// BLOG COMPONENT PROPS - CONSOLIDATED from frontend components.ts
// =============================================================================

export interface BlogContentSectionProps {
  content: string
  author: {
    name: string
    avatar?: string
    bio?: string
  }
  publishedAt: string
  readingTime: number
}

export interface BlogSidebarProps {
  categories: {
    name: string
    count: number
    href: string
  }[]
  recentPosts: {
    title: string
    href: string
    date: string
  }[]
  tags: string[]
}

// =============================================================================
// COMMON UI COMPONENT PROPS - CONSOLIDATED from frontend components.ts
// =============================================================================

export interface LoadingSkeletonProps {
  lines?: number
  className?: string
  animate?: boolean
}

export interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: {
    label: string
    onClick: () => void
  }
}

export interface GoogleSignupButtonProps {
  onSuccess?: (credential: string) => void
  onError?: (error: Error) => void
  disabled?: boolean
  className?: string
}

export interface SafeHTMLProps {
  html: string
  allowedTags?: string[]
  allowedAttributes?: Record<string, string[]>
  className?: string
}

// =============================================================================
// NAVIGATION COMPONENT PROPS - CONSOLIDATED from frontend components.ts
// =============================================================================

export interface NavigationLinkProps {
  href: string
  label: string
  icon?: ReactNode
  isActive?: boolean
  badge?: string | number
  onClick?: () => void
}

export interface NavigationGroupProps {
  title: string
  items: NavigationLinkProps[]
  isCollapsed?: boolean
  onToggle?: () => void
}

export interface TabNavigationProps {
  tabs: {
    id: string
    label: string
    href?: string
    icon?: ReactNode
    badge?: string | number
  }[]
  activeTab: string
  onTabChange?: (tabId: string) => void
}

export interface MobileNavigationProps {
  isOpen: boolean
  onClose: () => void
  items: NavigationLinkProps[]
}

// =============================================================================
// SEO COMPONENT PROPS
// =============================================================================

export interface SEOProps {
  title: string
  description: string
  canonical?: string
  openGraph?: {
    title?: string
    description?: string
    image?: string
  }
}

export interface LocalBusinessSchemaProps {
  name: string
  description: string
  url: string
  telephone?: string
  address?: {
    streetAddress: string
    addressLocality: string
    addressRegion: string
    postalCode: string
    addressCountry: string
  }
  openingHours?: string[]
}

export interface BreadcrumbsProps extends BaseProps {
  items: Array<{
    label: string
    href?: string
    isActive?: boolean
  }>
  separator?: ReactNode
}

// =============================================================================
// ERROR COMPONENT PROPS
// =============================================================================

export interface ErrorBoundaryProps extends BaseProps {
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: Record<string, unknown>) => void
}

export interface ErrorDisplayProps extends BaseProps {
  error: string
  onRetry?: () => void
}

export interface SuspenseBoundaryProps extends BaseProps {
  fallback?: ReactNode
}

// =============================================================================
// LANDING PAGE COMPONENT PROPS  
// =============================================================================

export interface HeroSectionProps extends BaseProps {
  title: string
  subtitle: string
  ctaText: string
  ctaHref: string
}

export interface FeaturesSectionProps extends BaseProps {
  features: Array<{
    title: string
    description: string
    icon: ReactNode
  }>
}

export interface TestimonialsSectionProps extends BaseProps {
  testimonials: Array<{
    name: string
    company: string
    content: string
    avatar?: string
  }>
}

// =============================================================================
// OLD CHART PROPS REMOVED - consolidated into new chart section above
// =============================================================================

// =============================================================================
// LEGACY PAGE PROPS - For Next.js pages
// =============================================================================

export interface PageProps {
  params: { [key: string]: string }
  searchParams: { [key: string]: string | string[] | undefined }
}

export interface AuthCallbackPageProps {
  searchParams: { code?: string; error?: string }
}

export interface CheckoutSession {
  id: string
  status: string
  customer_email: string
  payment_status: string
}

// =============================================================================
// ADDITIONAL UI TYPES - MIGRATED from inline definitions
// =============================================================================

// Button and form component types
export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'premium'
export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

export interface ButtonProps {
	variant?: ButtonVariant
	size?: ButtonSize
	asChild?: boolean
	className?: string
	disabled?: boolean
	children?: ReactNode
}

// Mutation loading and state management
export interface MutationLoadingProps {
	isLoading: boolean
	error?: string
	onRetry?: () => void
}

export interface MutationSuccessProps {
	message: string
	onDismiss?: () => void
}

export interface GlobalMutationLoadingProps {
	show: boolean
	message?: string
}

export interface LoadingButtonProps {
	isLoading?: boolean
	loadingText?: string
	variant?: ButtonVariant
	size?: ButtonSize
	className?: string
	children?: ReactNode
}

export interface MutationFormProps extends BaseProps {
	isLoading?: boolean
	error?: string
	onSubmit: (data: FormData) => void
}

// Table component types
export interface TableRowProps {
	selected?: boolean
	className?: string
	children?: ReactNode
}

export interface TableHeadProps {
	sortable?: boolean
	className?: string
	children?: ReactNode
}

// Command palette types
export interface CommandItem {
	id: string
	title: string
	description?: string
	icon?: ReactNode
	keywords?: string[]
	onSelect: () => void
}

// Charts and data visualization
export interface SparklineProps extends BaseProps {
	data: Array<{ value: number; date?: string }>
	color?: string
	height?: number
	width?: string | number
	showTooltip?: boolean
}

// Sidebar component types (enhanced)
export interface SidebarToggleProps {
	isOpen: boolean
	onToggle: () => void
	className?: string
}

export interface SidebarProviderProps extends BaseProps {
	defaultOpen?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

export interface SidebarContextProps {
	open: boolean
	setOpen: (open: boolean) => void
	openMobile: boolean
	setOpenMobile: (open: boolean) => void
	isMobile: boolean
	toggleSidebar: () => void
}

// Environment and configuration components
export interface EnvVar {
	key: string
	value?: string
	required: boolean
	description?: string
}

export interface EnvironmentCheckProps extends BaseProps {
	variables: EnvVar[]
}

// Viewport and layout constants
export interface Viewport {
	width: number
	height: number
	initialScale: number
	maximumScale: number
	userScalable: boolean
}

// Google Sign-in button
export interface GoogleIconProps {
	size?: number
	className?: string
}

// Dense table components
export interface DenseTableProps<TData, TValue> {
	data: TData[]
	columns: Array<{
		id: string
		header: string
		accessorKey: string
		cell?: (info: { getValue: () => TValue }) => ReactNode
	}>
	searchPlaceholder?: string
	emptyMessage?: string
	className?: string
}

export interface DenseTablePaginationProps<TData> {
	table: {
		getPageCount: () => number
		getState: () => { pagination: { pageIndex: number; pageSize: number } }
		previousPage: () => void
		nextPage: () => void
		getCanPreviousPage: () => boolean
		getCanNextPage: () => boolean
	}
}