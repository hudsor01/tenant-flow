import React from 'react'

/**
 * Loading state component for property detail page
 * Shows skeleton animation while property data is being fetched
 */
export default function PropertyLoadingState() {
	return (
		<div className="animate-pulse space-y-6">
			<div className="flex items-center space-x-4">
				<div className="h-10 w-10 rounded bg-gray-200" />
				<div className="h-8 w-64 rounded bg-gray-200" />
			</div>
			<div className="h-64 rounded-lg bg-gray-200" />
			<div className="grid grid-cols-1 gap-6 md:grid-cols-3">
				{[...Array(3)].map((_, i) => (
					<div key={i} className="h-32 rounded-lg bg-gray-200" />
				))}
			</div>
		</div>
	)
}
