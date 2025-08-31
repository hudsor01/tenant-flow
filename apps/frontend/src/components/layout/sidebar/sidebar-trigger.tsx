'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar-provider'
import { Menu } from 'lucide-react'
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
			<Menu className=" h-4 w-4"  />
		</Button>
	)
}
