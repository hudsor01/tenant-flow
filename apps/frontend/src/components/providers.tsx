'use client'

import type { ReactNode } from 'react'

import { DEFAULT_THEME_MODE, THEME_MODE_STORAGE_KEY } from '@/lib/theme-utils'
import PostHogClientProvider from '@/components/providers/posthog-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { AuthStoreProvider } from '@/stores/auth-provider'
import { PreferencesStoreProvider } from '@/stores/preferences-provider'
import type { PreferencesState } from '@/stores/preferences-store'

interface ProvidersProps {
	children: ReactNode
	initialThemeMode?: PreferencesState['themeMode']
}

export function Providers({
	children,
	initialThemeMode = DEFAULT_THEME_MODE
}: ProvidersProps) {
	return (
		<ThemeProvider
			attribute="class"
			defaultTheme={initialThemeMode}
			enableSystem
			disableTransitionOnChange
			storageKey={THEME_MODE_STORAGE_KEY}
		>
			<PreferencesStoreProvider themeMode={initialThemeMode}>
				<QueryProvider>
					<PostHogClientProvider>
						<AuthStoreProvider>{children}</AuthStoreProvider>
					</PostHogClientProvider>
				</QueryProvider>
			</PreferencesStoreProvider>
		</ThemeProvider>
	)
}
