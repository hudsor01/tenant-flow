// Framework-agnostic icon type that can accept React elements or other representations
type IconElement = unknown // Will be React.JSX.Element in frontend usage

export interface NavItem {
	id: string
	label: string
	href?: string
	icon?: IconElement
	badge?: string | number
	description?: string
	children?: NavItem[]
	external?: boolean
	disabled?: boolean
}

export interface TabItem {
	id: string
	label: string
	href?: string
	icon?: IconElement
	badge?: string | number
	disabled?: boolean
}

export interface BreadcrumbItem {
	label: string
	href?: string
	current?: boolean
	icon?: IconElement
}