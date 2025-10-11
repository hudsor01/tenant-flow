/**
 * React Profiler Wrapper for Performance Monitoring
 * Tracks component render performance in development
 */

'use client'

import { logger } from '@repo/shared/lib/frontend-logger'
import { Profiler, type ProfilerOnRenderCallback } from 'react'

interface ProfilerWrapperProps {
	id: string
	children: React.ReactNode
	enabled?: boolean
	logToConsole?: boolean
}

/**
 * Wrapper component for React Profiler
 * Automatically logs performance metrics for wrapped components
 *
 * Example:
 * <ProfilerWrapper id="TenantList">
 *   <TenantList />
 * </ProfilerWrapper>
 */
export function ProfilerWrapper({
	id,
	children,
	enabled = process.env.NODE_ENV === 'development',
	logToConsole = false
}: ProfilerWrapperProps) {
	const onRender: ProfilerOnRenderCallback = (
		id,
		phase,
		actualDuration,
		baseDuration,
		startTime,
		commitTime
	) => {
		// Only log if enabled
		if (!enabled) return

		// Log slow renders (> 16ms threshold for 60fps)
		if (actualDuration > 16) {
			logger.warn('Slow render detected', {
				action: 'profiler_slow_render',
				metadata: {
					componentId: id,
					phase,
					actualDuration: `${actualDuration.toFixed(2)}ms`,
					baseDuration: `${baseDuration.toFixed(2)}ms`,
					startTime: `${startTime.toFixed(2)}ms`,
					commitTime: `${commitTime.toFixed(2)}ms`
				}
			})
		}

		// Optional debug logging
		if (logToConsole) {
			logger.info(`Profiler - ${id} (${phase})`, {
				action: 'profiler_render',
				metadata: {
					componentId: id,
					phase,
					actualDuration: `${actualDuration.toFixed(2)}ms`,
					baseDuration: `${baseDuration.toFixed(2)}ms`
				}
			})
		}

		// Track performance metrics for analytics
		if (typeof window !== 'undefined' && window.performance) {
			// You can send these metrics to your analytics service
			// Example: posthog.capture('component_render', { ... })
		}
	}

	if (!enabled) {
		return <>{children}</>
	}

	return (
		<Profiler id={id} onRender={onRender}>
			{children}
		</Profiler>
	)
}

/**
 * HOC for wrapping components with Profiler
 * Useful for consistent profiling across the app
 *
 * Example:
 * const ProfiledTenantList = withProfiler('TenantList')(TenantList)
 */
export function withProfiler<P extends object>(componentId: string) {
	return function (Component: React.ComponentType<P>) {
		return function ProfiledComponent(props: P) {
			return (
				<ProfilerWrapper id={componentId}>
					<Component {...props} />
				</ProfilerWrapper>
			)
		}
	}
}
