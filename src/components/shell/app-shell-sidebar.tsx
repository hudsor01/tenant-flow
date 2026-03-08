import { Search, Sparkles, X } from 'lucide-react'
import Link from 'next/link'
import { MainNav } from './main-nav'

interface AppShellSidebarProps {
	sidebarRef: React.RefObject<HTMLElement | null>
	sidebarOpen: boolean
	closeSidebar: () => void
	onCommandOpen: () => void
}

export function AppShellSidebar({
	sidebarRef,
	sidebarOpen,
	closeSidebar,
	onCommandOpen
}: AppShellSidebarProps) {
	return (
		<aside
			ref={sidebarRef}
			role={sidebarOpen ? 'dialog' : undefined}
			aria-modal={sidebarOpen ? true : undefined}
			data-tour="sidebar-nav"
			className={`
				fixed inset-y-0 left-0 z-50 w-56 bg-card
				border-r border-border
				transform transition-transform duration-200 ease-out
				lg:translate-x-0 flex flex-col
				${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
			`}
		>
			{/* Logo */}
			<div className="flex items-center gap-3 px-4 h-14 shrink-0">
				<Link href="/dashboard" className="flex items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none hover:opacity-80 transition-opacity">
					<div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary">
						<Sparkles className="w-4 h-4 text-primary-foreground" />
					</div>
					<span className="font-semibold text-foreground text-lg tracking-tight">
						TenantFlow
					</span>
				</Link>
				<button
					className="ml-auto lg:hidden min-h-11 min-w-11 flex items-center justify-center rounded-md hover:bg-muted"
					onClick={closeSidebar}
					aria-label="Close navigation menu"
				>
					<X className="w-4 h-4 text-muted-foreground" />
				</button>
			</div>

			{/* Command Palette Trigger */}
			<div className="px-3 py-3">
				<button
					onClick={onCommandOpen}
					className="w-full flex items-center gap-2 px-3 py-2 bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-sm rounded-md border border-border transition-colors"
				>
					<Search className="w-4 h-4" />
					<span className="flex-1 text-left">Search...</span>
					<kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-background border border-border rounded">
						<span className="text-xs">&#8984;</span>K
					</kbd>
				</button>
			</div>

			{/* Navigation */}
			<MainNav onNavigate={closeSidebar} />
		</aside>
	)
}
