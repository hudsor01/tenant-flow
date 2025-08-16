'use client'

import React, {
	createContext,
	useContext,
	useCallback,
	useState,
	useEffect
} from 'react'

interface SearchHistoryItem {
	query: string
	timestamp: number
	resultCount: number
}

interface RecentItem {
	id: string
	type: 'property' | 'tenant' | 'lease' | 'maintenance' | 'navigation'
	title: string
	href: string
	timestamp: number
}

interface CommandPaletteContextType {
	// UI State
	isOpen: boolean
	currentPage: string[]
	searchQuery: string

	// Search History
	searchHistory: SearchHistoryItem[]

	// Recent Items (for quick access)
	recentItems: RecentItem[]

	// Actions
	open: () => void
	close: () => void
	toggle: () => void
	setPage: (page: string[]) => void
	setSearchQuery: (query: string) => void

	// History management
	addToSearchHistory: (query: string, resultCount: number) => void
	clearSearchHistory: () => void

	// Recent items management
	addRecentItem: (item: Omit<RecentItem, 'timestamp'>) => void
	clearRecentItems: () => void
}

const CommandPaletteContext = createContext<
	CommandPaletteContextType | undefined
>(undefined)

export function CommandPaletteProvider({
	children
}: {
	children: React.ReactNode
}) {
	const [isOpen, setIsOpen] = useState(false)
	const [currentPage, setCurrentPage] = useState<string[]>(['home'])
	const [searchQuery, setSearchQueryState] = useState('')
	const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
	const [recentItems, setRecentItems] = useState<RecentItem[]>([])

	// Load persisted data on mount
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('command-palette-storage')
			if (saved) {
				try {
					const {
						searchHistory: savedHistory,
						recentItems: savedRecent
					} = JSON.parse(saved)
					if (savedHistory) setSearchHistory(savedHistory)
					if (savedRecent) setRecentItems(savedRecent)
				} catch (error) {
					console.warn(
						'Failed to load command palette storage:',
						error
					)
				}
			}
		}
	}, [])

	// Persist data to localStorage
	useEffect(() => {
		if (typeof window !== 'undefined') {
			const data = { searchHistory, recentItems }
			localStorage.setItem(
				'command-palette-storage',
				JSON.stringify(data)
			)
		}
	}, [searchHistory, recentItems])

	const open = useCallback(() => {
		setIsOpen(true)
		setCurrentPage(['home'])
		setSearchQueryState('')

		// Track usage analytics if available
		if (typeof window !== 'undefined' && window.posthog) {
			window.posthog.capture('command_palette_opened', {
				timestamp: new Date().toISOString()
			})
		}
	}, [])

	const close = useCallback(() => {
		setIsOpen(false)

		// Track usage analytics if there was a search
		if (searchQuery && typeof window !== 'undefined' && window.posthog) {
			window.posthog.capture('command_palette_closed', {
				had_search: true,
				search_length: searchQuery.length,
				timestamp: new Date().toISOString()
			})
		}
	}, [searchQuery])

	const toggle = useCallback(() => {
		if (isOpen) {
			close()
		} else {
			open()
		}
	}, [isOpen, open, close])

	const setPage = useCallback((page: string[]) => {
		setCurrentPage(page)
	}, [])

	const setSearchQuery = useCallback((query: string) => {
		setSearchQueryState(query)

		// Debounced analytics tracking
		if (
			query.length > 2 &&
			typeof window !== 'undefined' &&
			window.posthog
		) {
			window.posthog.capture('command_palette_search', {
				query_length: query.length,
				timestamp: new Date().toISOString()
			})
		}
	}, [])

	const addToSearchHistory = useCallback(
		(query: string, resultCount: number) => {
			if (query.trim().length < 2) return

			const existingIndex = searchHistory.findIndex(
				item => item.query === query
			)

			const historyItem: SearchHistoryItem = {
				query: query.trim(),
				timestamp: Date.now(),
				resultCount
			}

			let newHistory: SearchHistoryItem[]

			if (existingIndex >= 0) {
				// Update existing item timestamp and move to front
				newHistory = [
					historyItem,
					...searchHistory.slice(0, existingIndex),
					...searchHistory.slice(existingIndex + 1)
				]
			} else {
				// Add new item to front
				newHistory = [historyItem, ...searchHistory]
			}

			// Keep only the last 20 searches
			newHistory = newHistory.slice(0, 20)

			setSearchHistory(newHistory)
		},
		[searchHistory]
	)

	const clearSearchHistory = useCallback(() => {
		setSearchHistory([])

		if (typeof window !== 'undefined' && window.posthog) {
			window.posthog.capture('command_palette_history_cleared', {
				timestamp: new Date().toISOString()
			})
		}
	}, [])

	const addRecentItem = useCallback(
		(item: Omit<RecentItem, 'timestamp'>) => {
			const existingIndex = recentItems.findIndex(
				recent => recent.id === item.id
			)

			const recentItem: RecentItem = {
				...item,
				timestamp: Date.now()
			}

			let newRecentItems: RecentItem[]

			if (existingIndex >= 0) {
				// Update timestamp and move to front
				newRecentItems = [
					recentItem,
					...recentItems.slice(0, existingIndex),
					...recentItems.slice(existingIndex + 1)
				]
			} else {
				// Add new item to front
				newRecentItems = [recentItem, ...recentItems]
			}

			// Keep only the last 10 recent items
			newRecentItems = newRecentItems.slice(0, 10)

			setRecentItems(newRecentItems)

			// Track recent item usage
			if (typeof window !== 'undefined' && window.posthog) {
				window.posthog.capture('command_palette_recent_item_added', {
					item_type: item.type,
					timestamp: new Date().toISOString()
				})
			}
		},
		[recentItems]
	)

	const clearRecentItems = useCallback(() => {
		setRecentItems([])

		if (typeof window !== 'undefined' && window.posthog) {
			window.posthog.capture('command_palette_recent_items_cleared', {
				timestamp: new Date().toISOString()
			})
		}
	}, [])

	const value: CommandPaletteContextType = {
		isOpen,
		currentPage,
		searchQuery,
		searchHistory,
		recentItems,
		open,
		close,
		toggle,
		setPage,
		setSearchQuery,
		addToSearchHistory,
		clearSearchHistory,
		addRecentItem,
		clearRecentItems
	}

	return (
		<CommandPaletteContext.Provider value={value}>
			{children}
		</CommandPaletteContext.Provider>
	)
}

export function useCommandPalette() {
	const context = useContext(CommandPaletteContext)
	if (context === undefined) {
		throw new Error(
			'useCommandPalette must be used within a CommandPaletteProvider'
		)
	}
	return context
}

// Hook for keyboard shortcuts
export function useCommandPaletteShortcuts() {
	const { open, close, toggle, isOpen } = useCommandPalette()

	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Cmd/Ctrl + K to toggle
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault()
				toggle()
			}

			// Escape to close
			if (e.key === 'Escape' && isOpen) {
				close()
			}
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [isOpen, toggle, close])

	return { open, close, toggle, isOpen }
}

// Hook for managing recent navigation
export function useRecentNavigation() {
	const { addRecentItem } = useCommandPalette()

	const addNavigationItem = React.useCallback(
		(
			id: string,
			type:
				| 'property'
				| 'tenant'
				| 'lease'
				| 'maintenance'
				| 'navigation',
			title: string,
			href: string
		) => {
			addRecentItem({ id, type, title, href })
		},
		[addRecentItem]
	)

	return { addNavigationItem }
}

// Helper hook for search analytics
export function useCommandPaletteAnalytics() {
	const { addToSearchHistory, searchHistory } = useCommandPalette()

	const trackSearch = React.useCallback(
		(query: string, resultCount: number) => {
			addToSearchHistory(query, resultCount)
		},
		[addToSearchHistory]
	)

	const getPopularSearches = React.useCallback(() => {
		return searchHistory
			.slice()
			.sort((a, b) => b.resultCount - a.resultCount)
			.slice(0, 5)
	}, [searchHistory])

	const getRecentSearches = React.useCallback(() => {
		return searchHistory
			.slice()
			.sort((a, b) => b.timestamp - a.timestamp)
			.slice(0, 5)
	}, [searchHistory])

	return {
		trackSearch,
		getPopularSearches,
		getRecentSearches,
		searchHistory
	}
}

// React is already imported at the top
