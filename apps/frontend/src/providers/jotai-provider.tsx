'use client'

import { Provider } from 'jotai'
import type { ReactNode } from 'react'
import { store } from '@/state/store'

interface JotaiProviderProps {
	children: ReactNode
}

export function JotaiProvider({ children }: JotaiProviderProps) {
	return <Provider store={store}>{children}</Provider>
}
