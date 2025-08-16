/**
 * UI component prop types and interfaces
 * Centralizes all reusable UI component interfaces
 */

import type { ReactNode } from 'react'
import type {
	BaseComponentProps,
	Size,
	Variant,
	Alignment,
	DisablableProps,
	LoadableProps,
	ClickHandler,
	ChangeHandler
} from '../core/common'

// ============================================
// Button Props
// ============================================

/**
 * Button component props
 */
export interface ButtonProps
	extends BaseComponentProps,
		DisablableProps,
		LoadableProps {
	type?: 'button' | 'submit' | 'reset'
	variant?: Variant
	size?: Size
	fullWidth?: boolean
	icon?: ReactNode
	iconPosition?: 'left' | 'right'
	href?: string
	target?: string
	onClick?: ClickHandler
}

/**
 * Icon button props
 */
export interface IconButtonProps extends Omit<ButtonProps, 'children'> {
	icon: ReactNode
	'aria-label': string
	tooltip?: string
}

/**
 * Button group props
 */
export interface ButtonGroupProps extends BaseComponentProps {
	variant?: Variant
	size?: Size
	orientation?: 'horizontal' | 'vertical'
	attached?: boolean
}

// ============================================
// Input Props
// ============================================

/**
 * Input component props
 */
export interface InputProps extends BaseComponentProps, DisablableProps {
	type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'search'
	placeholder?: string
	value?: string | number
	defaultValue?: string | number
	size?: Size
	variant?: 'default' | 'filled' | 'outline'
	error?: boolean
	leftIcon?: ReactNode
	rightIcon?: ReactNode
	leftElement?: ReactNode
	rightElement?: ReactNode
	onChange?: ChangeHandler<string>
	onFocus?: (event: React.FocusEvent) => void
	onBlur?: (event: React.FocusEvent) => void
}

/**
 * Textarea props
 */
export interface TextareaProps
	extends Omit<InputProps, 'type' | 'leftIcon' | 'rightIcon'> {
	rows?: number
	cols?: number
	resize?: 'none' | 'vertical' | 'horizontal' | 'both'
	autoResize?: boolean
}

// ============================================
// Select Props
// ============================================

/**
 * Native select props
 */
export interface NativeSelectProps extends BaseComponentProps, DisablableProps {
	value?: string | string[]
	defaultValue?: string | string[]
	placeholder?: string
	size?: Size
	variant?: 'default' | 'filled' | 'outline'
	multiple?: boolean
	error?: boolean
	children: ReactNode
	onChange?: ChangeHandler<string | string[]>
}

/**
 * Custom select option
 */
export interface SelectOption<T = unknown> {
	label: string
	value: T
	disabled?: boolean
	description?: string
	icon?: ReactNode
	group?: string
}

/**
 * Custom select props
 */
export interface CustomSelectProps<T = unknown>
	extends BaseComponentProps,
		DisablableProps {
	options: SelectOption<T>[]
	value?: T | T[]
	defaultValue?: T | T[]
	placeholder?: string
	size?: Size
	variant?: 'default' | 'filled' | 'outline'
	multiple?: boolean
	searchable?: boolean
	clearable?: boolean
	creatable?: boolean
	loading?: boolean
	error?: boolean
	maxDisplayed?: number
	groupBy?: string
	onChange?: ChangeHandler<T | T[]>
	onSearch?: (query: string) => void
	onCreate?: (value: string) => T
}

// ============================================
// Checkbox & Radio Props
// ============================================

/**
 * Checkbox props
 */
export interface CheckboxProps extends BaseComponentProps, DisablableProps {
	checked?: boolean
	defaultChecked?: boolean
	indeterminate?: boolean
	value?: string
	size?: Size
	error?: boolean
	label?: ReactNode
	description?: ReactNode
	onChange?: ChangeHandler<boolean>
}

/**
 * Radio props
 */
export interface RadioProps extends BaseComponentProps, DisablableProps {
	checked?: boolean
	defaultChecked?: boolean
	value: string
	name?: string
	size?: Size
	error?: boolean
	label?: ReactNode
	description?: ReactNode
	onChange?: ChangeHandler<string>
}

/**
 * Radio group props
 */
export interface RadioGroupProps extends BaseComponentProps, DisablableProps {
	value?: string
	defaultValue?: string
	name?: string
	orientation?: 'horizontal' | 'vertical'
	size?: Size
	error?: boolean
	onChange?: ChangeHandler<string>
}

// ============================================
// Switch Props
// ============================================

/**
 * Switch/toggle props
 */
export interface SwitchProps extends BaseComponentProps, DisablableProps {
	checked?: boolean
	defaultChecked?: boolean
	size?: Size
	label?: ReactNode
	description?: ReactNode
	color?: 'primary' | 'success' | 'warning' | 'error'
	onChange?: ChangeHandler<boolean>
}

// ============================================
// Slider Props
// ============================================

/**
 * Slider props
 */
export interface SliderProps extends BaseComponentProps, DisablableProps {
	value?: number | number[]
	defaultValue?: number | number[]
	min?: number
	max?: number
	step?: number
	marks?: boolean | Array<{ value: number; label?: ReactNode }>
	orientation?: 'horizontal' | 'vertical'
	size?: Size
	color?: 'primary' | 'secondary'
	showValue?: boolean
	formatValue?: (value: number) => string
	onChange?: ChangeHandler<number | number[]>
}

// ============================================
// Progress Props
// ============================================

/**
 * Progress bar props
 */
export interface ProgressProps extends BaseComponentProps {
	value?: number
	max?: number
	size?: Size
	variant?: 'default' | 'success' | 'warning' | 'error'
	animated?: boolean
	striped?: boolean
	showValue?: boolean
	label?: ReactNode
}

/**
 * Circular progress props
 */
export interface CircularProgressProps extends BaseComponentProps {
	value?: number
	max?: number
	size?: Size | number
	thickness?: number
	variant?: 'default' | 'success' | 'warning' | 'error'
	showValue?: boolean
	label?: ReactNode
}

// ============================================
// Loading Props
// ============================================

/**
 * Spinner props
 */
export interface SpinnerProps extends BaseComponentProps {
	size?: Size | number
	color?: 'primary' | 'secondary' | 'current'
	speed?: 'slow' | 'normal' | 'fast'
}

/**
 * Skeleton props
 */
export interface SkeletonProps extends BaseComponentProps {
	width?: string | number
	height?: string | number
	variant?: 'text' | 'rectangular' | 'circular'
	animated?: boolean
	lines?: number
}

// ============================================
// Badge Props
// ============================================

/**
 * Badge props
 */
export interface BadgeProps extends BaseComponentProps {
	variant?: Variant | 'dot'
	size?: Size
	color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'
	rounded?: boolean
	placement?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

// ============================================
// Avatar Props
// ============================================

/**
 * Avatar props
 */
export interface AvatarProps extends BaseComponentProps {
	src?: string
	alt?: string
	name?: string
	size?: Size | number
	shape?: 'circle' | 'square' | 'rounded'
	color?: 'primary' | 'secondary' | 'random'
	showBorder?: boolean
	showFallback?: boolean
	fallback?: ReactNode
}

/**
 * Avatar group props
 */
export interface AvatarGroupProps extends BaseComponentProps {
	max?: number
	size?: Size | number
	spacing?: 'tight' | 'normal' | 'loose'
	showBorder?: boolean
	moreText?: string
}

// ============================================
// Card Props
// ============================================

/**
 * Card props
 */
export interface CardProps extends BaseComponentProps {
	variant?: 'default' | 'outlined' | 'elevated'
	padding?: boolean | Size
	hoverable?: boolean
	clickable?: boolean
	selected?: boolean
	header?: ReactNode
	footer?: ReactNode
	onClick?: ClickHandler
}

/**
 * Card section props
 */
export interface CardSectionProps extends BaseComponentProps {
	padding?: boolean | Size
	divider?: boolean
}

// ============================================
// Divider Props
// ============================================

/**
 * Divider props
 */
export interface DividerProps extends BaseComponentProps {
	orientation?: 'horizontal' | 'vertical'
	variant?: 'solid' | 'dashed' | 'dotted'
	color?: 'default' | 'light' | 'dark'
	spacing?: Size
	label?: ReactNode
	labelPosition?: 'left' | 'center' | 'right'
}

// ============================================
// Alert Props
// ============================================

/**
 * Alert props
 */
export interface AlertProps extends BaseComponentProps {
	variant?: 'info' | 'success' | 'warning' | 'error'
	title?: ReactNode
	description?: ReactNode
	icon?: ReactNode | boolean
	closable?: boolean
	actions?: ReactNode
	onClose?: () => void
}

// ============================================
// Notification Props
// ============================================

/**
 * Toast notification props
 */
export interface ToastProps extends BaseComponentProps {
	variant?: 'info' | 'success' | 'warning' | 'error'
	title?: ReactNode
	description?: ReactNode
	duration?: number
	position?:
		| 'top'
		| 'bottom'
		| 'top-left'
		| 'top-right'
		| 'bottom-left'
		| 'bottom-right'
	closable?: boolean
	actions?: ReactNode
	onClose?: () => void
}

// ============================================
// Navigation Props
// ============================================

/**
 * UI Breadcrumb item
 */
export interface UIBreadcrumbItem {
	label: ReactNode
	href?: string
	current?: boolean
	onClick?: ClickHandler
}

/**
 * Breadcrumb props
 */
export interface BreadcrumbProps extends BaseComponentProps {
	items: UIBreadcrumbItem[]
	separator?: ReactNode
	maxItems?: number
	itemsBeforeCollapse?: number
	itemsAfterCollapse?: number
}

/**
 * Pagination props
 */
export interface PaginationProps extends BaseComponentProps {
	currentPage: number
	totalPages: number
	pageSize?: number
	totalItems?: number
	showFirst?: boolean
	showLast?: boolean
	showPrevNext?: boolean
	showPageNumbers?: boolean
	maxPageNumbers?: number
	size?: Size
	onPageChange?: (page: number) => void
	onPageSizeChange?: (pageSize: number) => void
}

// ============================================
// Table Props
// ============================================

/**
 * Table column definition
 */
export interface TableColumn<T = unknown> {
	key: string
	title: ReactNode
	dataIndex?: keyof T
	width?: string | number
	minWidth?: string | number
	maxWidth?: string | number
	align?: Alignment
	sortable?: boolean
	filterable?: boolean
	fixed?: 'left' | 'right'
	render?: (value: unknown, record: T, index: number) => ReactNode
}

/**
 * Table props
 */
export interface TableProps<T = unknown> extends BaseComponentProps {
	columns: TableColumn<T>[]
	data: T[]
	loading?: boolean
	size?: Size
	variant?: 'default' | 'striped' | 'bordered'
	hoverable?: boolean
	selectable?: boolean
	selectedKeys?: string[]
	sortBy?: string
	sortOrder?: 'asc' | 'desc'
	emptyText?: ReactNode
	stickyHeader?: boolean
	maxHeight?: string | number
	onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void
	onSelect?: (selectedKeys: string[], selectedRows: T[]) => void
	onRowClick?: (record: T, index: number) => void
}

// ============================================
// Tabs Props
// ============================================

/**
 * Tab item
 */
export interface TabItem {
	key: string
	label: ReactNode
	content: ReactNode
	disabled?: boolean
	closable?: boolean
	icon?: ReactNode
}

/**
 * Tabs props
 */
export interface TabsProps extends BaseComponentProps {
	items: TabItem[]
	activeKey?: string
	defaultActiveKey?: string
	size?: Size
	variant?: 'line' | 'card' | 'pills'
	position?: 'top' | 'bottom' | 'left' | 'right'
	centered?: boolean
	addable?: boolean
	onTabChange?: (key: string) => void
	onTabClose?: (key: string) => void
	onTabAdd?: () => void
}

// ============================================
// Accordion Props
// ============================================

/**
 * Accordion item
 */
export interface AccordionItem {
	key: string
	title: ReactNode
	content: ReactNode
	disabled?: boolean
	icon?: ReactNode
}

/**
 * Accordion props
 */
export interface AccordionProps extends BaseComponentProps {
	items: AccordionItem[]
	activeKey?: string | string[]
	defaultActiveKey?: string | string[]
	multiple?: boolean
	collapsible?: boolean
	size?: Size
	variant?: 'default' | 'bordered' | 'filled'
	onChange?: (key: string | string[]) => void
}
