'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar-provider'

// Mobile Sidebar Trigger
export function SidebarTrigger() {
	const { collapsed, setCollapsed } = useSidebar()

	return (
		<Button
			variant="ghost"
			size="icon"
			className="lg:hidden"
			onClick={() => setCollapsed(!collapsed)}
		>
			<i className="i-lucide-menu h-4 w-4"  />
		</Button>
	)
}
