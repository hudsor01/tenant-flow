'use client'

import { useRouter } from 'next/navigation'
import { useTransition, type ReactNode } from 'react'
import { RefreshButton } from './refresh-button'

interface RefreshableAnalyticsProps {
	children: ReactNode
	cooldownSeconds?: number
}

/**
 * Wrapper component for analytics pages with manual refresh
 *
 * Usage:
 * ```tsx
 * // In server component
 * export default async function AnalyticsPage() {
 *   const data = await getAnalyticsData()
 *
 *   return (
 *     <RefreshableAnalytics>
 *       <YourAnalyticsContent data={data} />
 *     </RefreshableAnalytics>
 *   )
 * }
 * ```
 *
 * Features:
 * - Uses Next.js router.refresh() to revalidate server components
 * - 30-second cooldown to prevent abuse
 * - Shows loading state during refresh
 * - No full page reload (soft navigation)
 */
export function RefreshableAnalytics({
	children,
	cooldownSeconds = 30
}: RefreshableAnalyticsProps) {
	const router = useRouter()
	const [isPending, startTransition] = useTransition()

	const handleRefresh = async () => {
		startTransition(() => {
			router.refresh()
		})
	}

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<RefreshButton
					onRefresh={handleRefresh}
					cooldownSeconds={cooldownSeconds}
				/>
			</div>
			<div className={isPending ? 'opacity-60 pointer-events-none' : ''}>
				{children}
			</div>
		</div>
	)
}
