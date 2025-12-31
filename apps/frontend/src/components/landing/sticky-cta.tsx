'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Button } from '#components/ui/button'
import { cn } from '#lib/utils'

export function StickyCta() {
	const [stickyCtaVisible, setStickyCtaVisible] = useState(false)

	useEffect(() => {
		const handleScroll = () => {
			setStickyCtaVisible(window.scrollY > 800)
		}
		window.addEventListener('scroll', handleScroll)
		return () => window.removeEventListener('scroll', handleScroll)
	}, [])

	return (
		<div
			className={cn(
				'fixed top-4 right-4 z-50 transition-all duration-500 transform',
				stickyCtaVisible
					? 'translate-y-0 opacity-100'
					: '-translate-y-2 opacity-0 pointer-events-none'
			)}
		>
			<Button
				size="lg"
				className="shadow-2xl shadow-primary/25 font-semibold"
				asChild
			>
				<Link href="/pricing" aria-label="Get started free">
					Start Free Trial
					<ArrowRight className="size-4 ml-2" />
				</Link>
			</Button>
		</div>
	)
}
