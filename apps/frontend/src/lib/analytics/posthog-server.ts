'use server'

import { PostHog } from 'posthog-node'
import { logger } from '@/lib/logger'
import type { TenantFlowEvent } from '@/hooks/use-posthog'

// Initialize PostHog for server-side tracking - only if key is available
const posthog = process.env.NEXT_PUBLIC_POSTHOG_KEY
	? new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
			host:
				process.env.NEXT_PUBLIC_POSTHOG_HOST ||
				'https://us.i.posthog.com',
			flushAt: 1, // Send immediately for server actions
			flushInterval: 0 // Don't batch on server
		})
	: null

/**
 * Track server-side events (for server actions, API routes)
 */
export async function trackServerSideEvent(
	eventName: TenantFlowEvent,
	userId?: string,
	properties?: Record<string, unknown>
): Promise<void> {
	try {
		if (!posthog || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
			logger.warn('PostHog key not configured for server-side tracking', {
				component: 'lib_analytics_posthog_server.ts'
			})
			return
		}

		posthog.capture({
			distinctId: userId || 'anonymous',
			event: eventName,
			properties: {
				...properties,
				$lib: 'posthog-node',
				$lib_version: '4.0.1',
				environment: process.env.NODE_ENV,
				timestamp: new Date().toISOString()
			}
		})

		// Ensure event is sent immediately
		await posthog.flush()
	} catch (error) {
		logger.error(
			'Failed to track server-side event:',
			error instanceof Error ? error : new Error(String(error)),
			{ component: 'lib_analytics_posthog_server.ts' }
		)
	}
}

/**
 * Identify user for server-side tracking
 */
export async function identifyUser(
	userId: string,
	properties: Record<string, unknown>
): Promise<void> {
	try {
		if (!posthog || !process.env.NEXT_PUBLIC_POSTHOG_KEY) {
			return
		}

		posthog.identify({
			distinctId: userId,
			properties: {
				...properties,
				$set: properties // Set user properties
			}
		})

		await posthog.flush()
	} catch (error) {
		logger.error(
			'Failed to identify user server-side:',
			error instanceof Error ? error : new Error(String(error)),
			{ component: 'lib_analytics_posthog_server.ts' }
		)
	}
}

/**
 * Shutdown PostHog client (for cleanup)
 */
export async function shutdownPostHog(): Promise<void> {
	if (posthog) {
		await posthog.shutdown()
	}
}
