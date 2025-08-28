/**
 * Simplified Command Palette - Native React Implementation
 * Using native browser features and React 19 patterns
 */
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

export function CommandPalette() {
	const router = useRouter()
	const [isOpen, setIsOpen] = useState(false)
	const [search, setSearch] = useState('')

	// Native keyboard shortcut handler
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Cmd+K or Ctrl+K
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault()
				setIsOpen(prev => !prev)
			}
			// Escape to close
			if (e.key === 'Escape' && isOpen) {
				setIsOpen(false)
				setSearch('')
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [isOpen])

	// Simple navigation handler
	const navigate = useCallback((path: string) => {
		router.push(path)
		setIsOpen(false)
		setSearch('')
	}, [router])

	// Simple search filter
	const matchesSearch = (text: string) => {
		if (!search) return true
		return text.toLowerCase().includes(search.toLowerCase())
	}

	// Navigation items - simplified without complex icons
	const navigationItems = [
		{ title: 'Dashboard', path: '/dashboard', keywords: 'home overview' },
		{ title: 'Properties', path: '/properties', keywords: 'buildings real estate' },
		{ title: 'Tenants', path: '/tenants', keywords: 'residents renters' },
		{ title: 'Leases', path: '/leases', keywords: 'contracts agreements' },
		{ title: 'Maintenance', path: '/maintenance', keywords: 'repairs requests' },
		{ title: 'Reports', path: '/reports', keywords: 'analytics statistics' },
		{ title: 'Settings', path: '/settings', keywords: 'preferences config' }
	]

	// Quick actions
	const quickActions = [
		{ title: 'Add Property_', path: '/properties/new', keywords: 'create new property' },
		{ title: 'Add Tenant', path: '/tenants/new', keywords: 'create new tenant' },
		{ title: 'Create Lease', path: '/leases/new', keywords: 'new lease agreement' },
		{ title: 'New Maintenance Request', path: '/maintenance/new', keywords: 'repair request' }
	]

	// Filter items based on search
	const filteredNavigation = navigationItems.filter(item => 
		matchesSearch(item.title) || matchesSearch(item.keywords)
	)
	
	const filteredActions = quickActions.filter(item =>
		matchesSearch(item.title) || matchesSearch(item.keywords)
	)

	if (!isOpen) return null

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogContent className="max-w-2xl p-0">
				<div className="border-b p-4">
					<input
						type="text"
						placeholder="Search commands..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
						autoFocus
					/>
				</div>
				
				<div className="max-h-96 overflow-y-auto p-2">
					{filteredNavigation.length > 0 && (
						<div className="mb-4">
							<div className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
								Navigation
							</div>
							{filteredNavigation.map(item => (
								<button
									key={item.path}
									onClick={() => navigate(item.path)}
									className="w-full rounded-md px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
								>
									{item.title}
								</button>
							))}
						</div>
					)}

					{filteredActions.length > 0 && (
						<div>
							<div className="mb-2 px-2 text-xs font-semibold text-muted-foreground">
								Quick Actions
							</div>
							{filteredActions.map(item => (
								<button
									key={item.path}
									onClick={() => navigate(item.path)}
									className="w-full rounded-md px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground"
								>
									<span>{item.title}</span>
									<Badge variant="secondary" className="ml-2">
										New
									</Badge>
								</button>
							))}
						</div>
					)}

					{filteredNavigation.length === 0 && filteredActions.length === 0 && (
						<div className="px-3 py-8 text-center text-sm text-muted-foreground">
							No _results found for "{search}"
						</div>
					)}
				</div>

				<div className="border-t p-3">
					<div className="flex items-center justify-between text-xs text-muted-foreground">
						<span>⌘K to toggle</span>
						<span>ESC to close</span>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

// Simple provider to add command palette globally
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
	return (
		<>
			{children}
			<CommandPalette />
		</>
	)
}