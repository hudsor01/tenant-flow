import { NavUser } from '@/components/dashboard/nav-user'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'

export function SiteHeader() {
	return (
		<header className="flex h-16 shrink-0 items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-6">
			<div className="flex items-center gap-2">
				<SidebarTrigger className="-ml-1" />
				<Separator
					orientation="vertical"
					className="mx-2 data-[orientation=vertical]:h-4"
				/>
				<h1
					className="font-medium"
					style={{
						fontSize: 'var(--font-title-2)',
						lineHeight: 'var(--line-height-title-2)',
						color: 'var(--color-label-primary)'
					}}
				>
					Dashboard
				</h1>
			</div>
			<div className="flex items-center">
				<NavUser />
			</div>
		</header>
	)
}
