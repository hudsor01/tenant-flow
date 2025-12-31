'use client'

import { cn } from '#lib/utils'
import Image from 'next/image'
import { useState } from 'react'

interface NavbarLogoProps {
	logo: string
}

export function NavbarLogo({ logo }: NavbarLogoProps) {
	const [logoHover, setLogoHover] = useState(false)

	return (
		<div
			onMouseEnter={() => setLogoHover(true)}
			onMouseLeave={() => setLogoHover(false)}
			className={cn(
				'flex items-center space-x-2 transition-transform duration-fast',
				logoHover && 'scale-105'
			)}
		>
			<div className="size-11 rounded-lg overflow-hidden bg-background border border-border flex-center">
				<Image
					src="/tenant-flow-logo.png"
					alt="TenantFlow"
					width={24}
					height={24}
					className="size-6 object-contain"
					priority
				/>
			</div>
			<span className="text-xl font-bold text-foreground">{logo}</span>
		</div>
	)
}
