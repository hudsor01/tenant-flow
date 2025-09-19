'use client'

import { cn } from '@/lib/utils'
import { animated, config, useSpring } from '@react-spring/web'
import * as React from 'react'



const DEFAULT_THEMES = [
	{
		name: 'Default',
		value: 'default'
	},
	{
		name: 'Blue',
		value: 'blue'
	},
	{
		name: 'Green',
		value: 'green'
	},
	{
		name: 'Amber',
		value: 'amber'
	}
]

const SCALED_THEMES = [
	{
		name: 'Default',
		value: 'default-scaled'
	},
	{
		name: 'Blue',
		value: 'blue-scaled'
	}
]

const MONO_THEMES = [
	{
		name: 'Mono',
		value: 'mono-scaled'
	}
]

type ThemeSelectorProps = React.ComponentProps<'div'>

export const ThemeSelector = React.forwardRef<
	HTMLDivElement,
	ThemeSelectorProps
>(({ className, ...props }, ref) => {
	const { activeTheme, setActiveTheme } = useThemeConfig()
	const [isHovered, setIsHovered] = React.useState(false)
	const [isClicked, setIsClicked] = React.useState(false)

	const springProps = useSpring({
		transform: isClicked
			? 'scale(0.95)'
			: isHovered
				? 'scale(1.05)'
				: 'scale(1)',
		config: config.wobbly
	})

	const fadeInProps = useSpring({
		from: { opacity: 0, y: 10 },
		to: { opacity: 1, y: 0 },
		config: config.gentle
	})

	return (
		<animated.div
			ref={ref}
			style={fadeInProps}
			className={cn('flex items-center gap-2', className)}
			{...props}
		>
			<Label htmlFor="theme-selector" className="sr-only">
				Theme
			</Label>
			<Select value={activeTheme} onValueChange={setActiveTheme}>
				<animated.div style={springProps}>
					<SelectTrigger
						id="theme-selector"
						size="sm"
						className="justify-start *:data-[slot=select-value]:w-12"
						onMouseEnter={() => setIsHovered(true)}
						onMouseLeave={() => setIsHovered(false)}
						onMouseDown={() => setIsClicked(true)}
						onMouseUp={() => setIsClicked(false)}
					>
						<span className="text-muted-foreground hidden sm:block">
							Select a theme:
						</span>
						<span className="text-muted-foreground block sm:hidden">Theme</span>
						<SelectValue placeholder="Select a theme" />
					</SelectTrigger>
				</animated.div>
				<SelectContent align="end">
					<SelectGroup>
						<SelectLabel>Default</SelectLabel>
						{DEFAULT_THEMES.map(theme => (
							<SelectItem key={theme.name} value={theme.value}>
								{theme.name}
							</SelectItem>
						))}
					</SelectGroup>
					<SelectSeparator />
					<SelectGroup>
						<SelectLabel>Scaled</SelectLabel>
						{SCALED_THEMES.map(theme => (
							<SelectItem key={theme.name} value={theme.value}>
								{theme.name}
							</SelectItem>
						))}
					</SelectGroup>
					<SelectGroup>
						<SelectLabel>Monospaced</SelectLabel>
						{MONO_THEMES.map(theme => (
							<SelectItem key={theme.name} value={theme.value}>
								{theme.name}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
		</animated.div>
	)
})
ThemeSelector.displayName = 'ThemeSelector'
