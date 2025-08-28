'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function HeroButtons() {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
			<Link href="/auth/signup?source=hero">
				<Button size="default" className="bg-primary text-primary-foreground hover:bg-primary/90">
					Start Free Trial
					<i className="i-lucide-arrow-right ml-2 h-4 w-4" />
				</Button>
			</Link>
			<Link href="/demo">
				<Button size="default" variant="outline">
					<i className="i-lucide-calendar mr-2 h-4 w-4"  />
					Book a Demo
				</Button>
			</Link>
		</div>
	)
}
