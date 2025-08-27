export interface NavItem {
	id: string
	label: string
	href?: string
	icon?: React.ReactNode
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
	icon?: React.ReactNode
	badge?: string | number
	disabled?: boolean
}