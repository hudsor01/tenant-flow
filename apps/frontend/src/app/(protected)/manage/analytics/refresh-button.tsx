'use client'

import { Button } from '@/components/ui/button'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { RefreshCw } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

interface RefreshButtonProps {
	onRefresh: () => Promise<void>
	cooldownSeconds?: number
	className?: string
}

/**
 * Analytics refresh button with rate limiting
 *
 * Features:
 * - Prevents spam clicking (30s cooldown by default)
 * - Shows countdown timer during cooldown
 * - Loading state during refresh
 * - Toast notifications for UX feedback
 *
 * @param onRefresh - Async function to fetch fresh data
 * @param cooldownSeconds - Minimum seconds between refreshes (default: 30)
 */
export function RefreshButton({
	onRefresh,
	cooldownSeconds = 30,
	className
}: RefreshButtonProps) {
	const [isRefreshing, setIsRefreshing] = useState(false)
	const [cooldownRemaining, setCooldownRemaining] = useState(0)
	const logger = useMemo(() => createLogger({ component: 'RefreshButton' }), [])

	const handleRefresh = useCallback(async () => {
		if (isRefreshing || cooldownRemaining > 0) {
			if (cooldownRemaining > 0) {
				toast.warning(
					`Please wait ${cooldownRemaining}s before refreshing again`
				)
			}
			return
		}

		try {
			setIsRefreshing(true)
			await onRefresh()
			toast.success('Data refreshed successfully')

			// Start cooldown
			setCooldownRemaining(cooldownSeconds)
			const interval = setInterval(() => {
				setCooldownRemaining(prev => {
					if (prev <= 1) {
						clearInterval(interval)
						return 0
					}
					return prev - 1
				})
			}, 1000)
		} catch (error) {
			toast.error('Failed to refresh data')
			logger.error('Refresh error', { action: 'refresh' }, error)
		} finally {
			setIsRefreshing(false)
		}
	}, [isRefreshing, cooldownRemaining, cooldownSeconds, onRefresh, logger])

	const isDisabled = isRefreshing || cooldownRemaining > 0

	return (
		<Button
			variant="outline"
			size="sm"
			onClick={handleRefresh}
			disabled={isDisabled}
			className={className}
		>
			<RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
			{isRefreshing
				? 'Refreshing...'
				: cooldownRemaining > 0
					? `Wait ${cooldownRemaining}s`
					: 'Refresh'}
		</Button>
	)
}
