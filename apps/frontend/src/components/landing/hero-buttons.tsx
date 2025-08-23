'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Calendar } from 'lucide-react'

export function HeroButtons() {
	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
			<Link href="/signup">
				<Button
					size="default"
					className="bg-blue-600 text-white hover:bg-blue-700"
				>
					Start Free Trial
					<ArrowRight className="ml-2 h-4 w-4" />
				</Button>
			</Link>
			<Link href="/demo">
				<Button size="default" variant="outline">
					<Calendar className="mr-2 h-4 w-4" />
					Book a Demo
				</Button>
			</Link>
		</div>
	)
}
