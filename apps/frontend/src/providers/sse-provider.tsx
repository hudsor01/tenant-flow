'use client'

/**
 * SSE Provider - No-Op Stub
 *
 * The NestJS SSE endpoint has been removed as part of the NestJS elimination (Phase 57).
 * This stub preserves the import interface in providers.tsx without any NestJS connection.
 *
 * TODO(phase-57): If real-time updates are needed in future, implement via Supabase Realtime
 * channels instead (supabase.channel() + subscribe()).
 */

import type { ReactNode } from 'react'

interface SseProviderProps {
	children: ReactNode
	/** Disable SSE entirely (useful for testing) */
	disabled?: boolean
}

export function SseProvider({ children }: SseProviderProps) {
	return <>{children}</>
}
