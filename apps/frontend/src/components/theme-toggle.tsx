'use client'

import * as React from 'react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
	const { setTheme } = useTheme()

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
					<i className="i-lucide-sun inline-block h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"  />
					<i className="i-lucide-moon inline-block absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"  />
					<span className="sr-only">Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					onClick={() => setTheme('light')}
					className="cursor-pointer"
				>
					<i className="i-lucide-sun inline-block mr-2 h-4 w-4"  />
					<span>Light</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme('dark')}
					className="cursor-pointer"
				>
					<i className="i-lucide-moon inline-block mr-2 h-4 w-4"  />
					<span>Dark</span>
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() => setTheme('system')}
					className="cursor-pointer"
				>
					<i className="i-lucide-monitor inline-block mr-2 h-4 w-4"  />
					<span>System</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
