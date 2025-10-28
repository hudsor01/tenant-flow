'use client'

import { cn } from '#lib/design-system'
import { useQuery } from '@tanstack/react-query'
import React, { useCallback, useEffect, useRef } from 'react'

interface ParticleType {
	x: number
	y: number
	vx: number
	vy: number
	life: number
	maxLife: number
	size: number
	alpha: number
}

interface ParticlesProps extends React.HTMLAttributes<HTMLDivElement> {
	quantity?: number
	staticity?: number
	ease?: number
	size?: number
	color?: string
	refresh?: boolean
	theme?: 'light' | 'dark' | 'auto'
	preset?: 'subtle' | 'dynamic' | 'floating' | 'sparkling'
	density?: 'low' | 'medium' | 'high'
	reducedMotion?: boolean
}

function ParticlesComponent({
	className,
	quantity = 50,
	staticity = 50,
	ease = 50,
	size = 0.4,
	color = 'oklch(var(--foreground))',
	refresh = false,
	theme = 'auto',
	preset = 'subtle',
	density = 'medium',
	reducedMotion = false,
	...props
}: ParticlesProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const particlesRef = useRef<ParticleType[]>([])
	const animationFrameRef = useRef<number | null>(null)
	const mouseRef = useRef({ x: 0, y: 0 })

	// TanStack Query-based preset configuration (replaces useMemo with automatic structural sharing)
	const { data: presetConfig } = useQuery({
		queryKey: ['particles', 'preset-config', preset],
		queryFn: () =>
			Promise.resolve({
				subtle: {
					quantity: 30,
					size: 0.8,
					ease: 20,
					opacity: 0.3,
					speed: 0.5
				},
				dynamic: {
					quantity: 80,
					size: 1.2,
					ease: 60,
					opacity: 0.6,
					speed: 1.0
				},
				floating: {
					quantity: 40,
					size: 1.5,
					ease: 30,
					opacity: 0.4,
					speed: 0.3
				},
				sparkling: {
					quantity: 120,
					size: 0.5,
					ease: 80,
					opacity: 0.8,
					speed: 1.5
				}
			}),
		select: configs => configs[preset],
		staleTime: Infinity, // Static data, never refetch
		gcTime: Infinity // Keep in memory indefinitely
	})

	// Theme-aware color handling
	const getThemeColor = useCallback(() => {
		if (theme === 'auto') {
			const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
			return isDark ? 'oklch(var(--foreground))' : 'oklch(var(--foreground))'
		}
		return theme === 'dark'
			? 'oklch(var(--foreground))'
			: 'oklch(var(--foreground))'
	}, [theme])

	// TanStack Query-based quantity calculation (replaces useMemo with select transformation)
	const { data: calculatedQuantity } = useQuery({
		queryKey: ['particles', 'quantity', preset, density, quantity],
		queryFn: () => Promise.resolve({ preset, density, quantity }),
		select: ({ preset, density, quantity }) => {
			const densityMultiplier = { low: 0.5, medium: 1, high: 1.5 }[density]
			// Use preset to determine base quantity if quantity not provided
			const presetQuantities = { snow: 80, stars: 120, bubbles: 60 }
			const baseQuantity =
				quantity ||
				presetQuantities[preset as keyof typeof presetQuantities] ||
				(presetConfig?.quantity ?? 50)
			return Math.floor(baseQuantity * densityMultiplier)
		},
		staleTime: Infinity, // Static calculation, never refetch
		enabled: !!presetConfig // Only calculate when presetConfig is available
	})

	useEffect(() => {
		const canvas = canvasRef.current
		if (!canvas) return

		const ctx = canvas.getContext('2d')
		if (!ctx) return

		// Performance optimization: enable alpha for better blending
		ctx.globalCompositeOperation = 'lighter'

		const resizeCanvas = () => {
			const rect = canvas.getBoundingClientRect()
			canvas.width = rect.width * devicePixelRatio
			canvas.height = rect.height * devicePixelRatio
			ctx.scale(devicePixelRatio, devicePixelRatio)
			canvas.style.width = rect.width + 'px'
			canvas.style.height = rect.height + 'px'
		}

		const createParticle = (): ParticleType => {
			// Safe defaults when presetConfig is not yet loaded
			const config = presetConfig || {
				ease: 50,
				speed: 0.5,
				size: 0.4,
				opacity: 0.5
			}

			return {
				x: Math.random() * canvas.clientWidth,
				y: Math.random() * canvas.clientHeight,
				vx: (Math.random() - 0.5) * ((ease || config.ease) / 10) * config.speed,
				vy: (Math.random() - 0.5) * ((ease || config.ease) / 10) * config.speed,
				life: 0,
				maxLife: Math.random() * 300 + 150,
				size: (size || config.size) * (0.8 + Math.random() * 0.4),
				alpha: config.opacity * (0.5 + Math.random() * 0.5)
			}
		}

		const initParticles = () => {
			particlesRef.current = Array.from(
				{ length: calculatedQuantity || 50 },
				createParticle
			)
		}

		const updateParticle = (particle: ParticleType) => {
			// Skip animation if reduced motion is preferred
			if (reducedMotion) return

			particle.x += particle.vx
			particle.y += particle.vy
			particle.life++

			// Smooth boundary conditions with damping
			const margin = 50
			if (particle.x < -margin) {
				particle.x = canvas.clientWidth + margin
			} else if (particle.x > canvas.clientWidth + margin) {
				particle.x = -margin
			}

			if (particle.y < -margin) {
				particle.y = canvas.clientHeight + margin
			} else if (particle.y > canvas.clientHeight + margin) {
				particle.y = -margin
			}

			// Enhanced particle lifecycle with smooth fade
			if (particle.life > particle.maxLife) {
				Object.assign(particle, createParticle())
			}

			// Update alpha for smooth fading with safe defaults
			const lifeCycle = particle.life / particle.maxLife
			const config = presetConfig || { opacity: 0.5 }
			particle.alpha =
				config.opacity *
				(1 - lifeCycle * 0.3) *
				(0.5 + Math.sin(lifeCycle * Math.PI) * 0.5)
		}

		const drawParticle = (particle: ParticleType) => {
			// Enhanced drawing with glow effect for sparkling preset
			if (preset === 'sparkling') {
				// Outer glow
				const glowSize = particle.size * 3
				const gradient = ctx.createRadialGradient(
					particle.x,
					particle.y,
					0,
					particle.x,
					particle.y,
					glowSize
				)
				// Canvas API requires rgba format for gradients
				const baseAlpha = particle.alpha * 0.8
				gradient.addColorStop(0, `oklch(0.5 0.1 280 / ${baseAlpha})`)
				gradient.addColorStop(
					0.5,
					`oklch(0.5 0.1 280 / ${particle.alpha * 0.2})`
				)
				gradient.addColorStop(1, `oklch(0.5 0.1 280 / 0)`)

				ctx.fillStyle = gradient
				ctx.beginPath()
				ctx.arc(particle.x, particle.y, glowSize, 0, Math.PI * 2)
				ctx.fill()
			}

			// Main particle - use oklch for consistency with design system
			ctx.fillStyle = `oklch(0.5 0.1 280 / ${particle.alpha})`
			ctx.beginPath()
			ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
			ctx.fill()
		}

		const animate = () => {
			// Fade out animation instead of clear for smoother effect
			if (preset === 'floating' || preset === 'subtle') {
				ctx.fillStyle = 'oklch(1 0 0 / 0.05)'
				ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight)
			} else {
				ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
			}

			particlesRef.current.forEach(particle => {
				updateParticle(particle)
				drawParticle(particle)
			})

			if (!reducedMotion) {
				animationFrameRef.current = requestAnimationFrame(animate)
			}
		}

		const handleMouseMove = (e: MouseEvent) => {
			const rect = canvas.getBoundingClientRect()
			mouseRef.current.x = e.clientX - rect.left
			mouseRef.current.y = e.clientY - rect.top

			// Add mouse interaction for dynamic preset
			if (preset === 'dynamic') {
				particlesRef.current.forEach(particle => {
					const dx = particle.x - mouseRef.current.x
					const dy = particle.y - mouseRef.current.y
					const distance = Math.sqrt(dx * dx + dy * dy)

					if (distance < 100) {
						const force = (100 - distance) / 100
						particle.vx += (dx / distance) * force * 0.5
						particle.vy += (dy / distance) * force * 0.5
					}
				})
			}
		}

		// Check for reduced motion preference
		const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
		const handleReducedMotionChange = () => {
			if (mediaQuery.matches || reducedMotion) {
				if (animationFrameRef.current) {
					cancelAnimationFrame(animationFrameRef.current)
					animationFrameRef.current = null
				}
			} else {
				animate()
			}
		}

		resizeCanvas()
		initParticles()

		if (!mediaQuery.matches && !reducedMotion) {
			animate()
		}

		window.addEventListener('resize', resizeCanvas)
		canvas.addEventListener('mousemove', handleMouseMove)
		mediaQuery.addEventListener('change', handleReducedMotionChange)

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current)
			}
			window.removeEventListener('resize', resizeCanvas)
			canvas.removeEventListener('mousemove', handleMouseMove)
			mediaQuery.removeEventListener('change', handleReducedMotionChange)
		}
	}, [
		calculatedQuantity,
		staticity,
		ease,
		size,
		color,
		refresh,
		preset,
		theme,
		density,
		reducedMotion,
		getThemeColor,
		presetConfig
	])

	return (
		<div
			className={cn('pointer-events-none absolute inset-0', className)}
			{...props}
			// Accessibility improvements
			aria-hidden="true"
			role="presentation"
		>
			<canvas
				ref={canvasRef}
				className="block size-full"
				aria-hidden="true"
			/>
		</div>
	)
}

// Named export for story compatibility
export const Particles = ParticlesComponent
export default ParticlesComponent
