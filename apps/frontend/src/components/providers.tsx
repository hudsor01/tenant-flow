'use client'

import type { ReactNode } from 'react'

import { DEFAULT_THEME_MODE, THEME_MODE_STORAGE_KEY } from '@/lib/theme-utils'
import { QueryProvider } from '@/providers/query-provider'
import { ThemeProvider } from '@/providers/theme-provider'
import { AuthStoreProvider } from '@/stores/auth-provider'
import { PreferencesStoreProvider } from '@/stores/preferences-provider'
import type { PreferencesState } from '@/stores/preferences-store'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

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
					<NuqsAdapter>
						<AuthStoreProvider>{children}</AuthStoreProvider>
					</NuqsAdapter>
				</QueryProvider>
			</PreferencesStoreProvider>
		</ThemeProvider>
	)
}
