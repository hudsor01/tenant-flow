'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

import { Particles } from 'src/components/ui/particles'

export function ParticlesShowcase() {
	const { theme } = useTheme()
	const [color, setColor] = useState('hsl(var(--foreground))')

	useEffect(() => {
		setColor(
			theme === 'dark' ? 'hsl(var(--foreground))' : 'hsl(var(--foreground))'
		)
	}, [theme])

	return (
		<div className="particle-showcase">
			<span className="particle-text">Particles</span>
			<Particles
				className="particle-overlay"
				quantity={100}
				ease={80}
				color={color}
				refresh
			/>
		</div>
	)
}
