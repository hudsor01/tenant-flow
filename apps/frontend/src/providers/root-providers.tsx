/**
 * Root providers wrapper - SINGLE source of truth for all providers
 * Following KISS and DRY principles from CLAUDE.md
 */
'use client'

import type { ReactNode } from 'react'
import { ThemeProvider } from '@/components/theme-provider'
import { QueryProvider } from './query-provider'
import { PHProvider } from './posthog-provider'
import { PostHogErrorBoundary } from '@/components/analytics/posthog-error-boundary'
import { PostHogUserProvider } from '@/components/analytics/posthog-user-provider'
import { CommandPaletteProvider } from '@/hooks/use-command-palette'

interface RootProvidersProps {
	children: ReactNode
}

/**
 * ALL providers should be here, not scattered across layouts
 * This prevents duplicate provider instances and simplifies the architecture
 */
export function RootProviders({ children }: RootProvidersProps) {
	return (
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem>
			<PHProvider>
				<PostHogErrorBoundary>
					<QueryProvider>
						<PostHogUserProvider>
							<CommandPaletteProvider>
								{children}
							</CommandPaletteProvider>
						</PostHogUserProvider>
					</QueryProvider>
				</PostHogErrorBoundary>
			</PHProvider>
		</ThemeProvider>
	)
}