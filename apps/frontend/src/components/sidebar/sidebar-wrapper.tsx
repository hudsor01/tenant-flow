'use client'

import { AppSidebar } from '@/components/sidebar/app-sidebar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useLocalStorage } from '@/hooks/use-local-storage'
import type { ReactNode } from 'react'

export function SidebarWrapper({ children }: { children: ReactNode }) {
	const [defaultOpen, setDefaultOpen] = useLocalStorage('sidebar_state', true)

	return (
		<SidebarProvider
			defaultOpen={defaultOpen}
			onOpenChange={setDefaultOpen}
			style={
				{
					'--sidebar-width': 'calc(var(--spacing) * 72)'
				} as React.CSSProperties
			}
		>
			<AppSidebar variant="inset" />
			<SidebarInset>{children}</SidebarInset>
		</SidebarProvider>
	)
}