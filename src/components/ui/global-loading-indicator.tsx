'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLoadingStore } from '#stores/loading-store'
import { LoadingSpinner } from '#components/ui/loading-spinner'

const MIN_VISIBLE_MS = 120

export function GlobalLoadingIndicator() {
	const { isLoading, activeOperationCount, globalProgress } = useLoadingStore()
	const [visible, setVisible] = useState(isLoading)
	const [lastShownAt, setLastShownAt] = useState<number | null>(
		isLoading ? Date.now() : null
	)

	useEffect(() => {
		if (isLoading) {
			setVisible(true)
			setLastShownAt(Date.now())
			return
		}

		const now = Date.now()
		const elapsed = lastShownAt ? now - lastShownAt : MIN_VISIBLE_MS
		const remaining = Math.max(0, MIN_VISIBLE_MS - elapsed)
		const timer = setTimeout(() => setVisible(false), remaining)
		return () => clearTimeout(timer)
	}, [isLoading, lastShownAt])

	const label = useMemo(() => {
		if (activeOperationCount > 1) {
			return `${activeOperationCount} actions in progress`
		}
		return 'Loading…'
	}, [activeOperationCount])

	if (!visible) return null

	return (
		<div
			data-testid="global-loading-indicator"
			aria-live="polite"
			className="pointer-events-none fixed inset-x-0 top-2 z-[70] flex justify-center px-3"
		>
			<div className="inline-flex items-center gap-2 rounded-full border bg-card/95 px-3 py-2 shadow-lg backdrop-blur-sm">
				<LoadingSpinner size="sm" variant="primary" className="text-primary" />
				<span className="text-xs font-medium text-foreground">{label}</span>
				{activeOperationCount > 0 && (
					<span className="text-[10px] text-muted-foreground">
						{globalProgress}%
					</span>
				)}
			</div>
		</div>
	)
}
