'use client'

import type { ElementType } from 'react'
import { Receipt, Wrench, Building2, DollarSign } from 'lucide-react'

const categoryIcons: Record<string, ElementType> = {
	maintenance: Wrench,
	utilities: Building2,
	insurance: Receipt,
	taxes: DollarSign,
	management: Building2,
	other: Receipt
}

const categoryStyles: Record<string, string> = {
	maintenance:
		'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
	utilities:
		'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
	insurance:
		'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
	taxes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
	management:
		'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
	other: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'
}

const defaultStyle =
	'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300'

export function getCategoryBadge(category: string) {
	const Icon = categoryIcons[category] ?? Receipt

	return (
		<span
			className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${categoryStyles[category] ?? defaultStyle}`}
		>
			<Icon className="w-3 h-3" />
			{category.charAt(0).toUpperCase() + category.slice(1)}
		</span>
	)
}

export const EXPENSE_CATEGORIES = [
	{ value: 'all', label: 'All Categories' },
	{ value: 'maintenance', label: 'Maintenance' },
	{ value: 'utilities', label: 'Utilities' },
	{ value: 'insurance', label: 'Insurance' },
	{ value: 'taxes', label: 'Taxes' },
	{ value: 'management', label: 'Management' },
	{ value: 'other', label: 'Other' }
]
