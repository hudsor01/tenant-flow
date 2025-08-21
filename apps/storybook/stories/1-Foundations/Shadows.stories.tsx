import React from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta = {
	title: 'Foundations/Shadows & Effects',
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'Shadow system and visual effects for depth and hierarchy.'
			}
		}
	}
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const ElevationScale: Story = {
	render: () => (
		<div className="space-y-8 bg-gray-50 p-8">
			<section>
				<h2 className="mb-6 text-2xl font-bold">Elevation Scale</h2>
				<div className="grid grid-cols-3 gap-6">
					<div className="rounded-lg bg-white p-6">
						<p className="mb-2 text-sm font-medium text-gray-600">
							No Shadow
						</p>
						<p className="text-xs text-gray-500">shadow-none</p>
					</div>
					<div className="rounded-lg bg-white p-6 shadow-sm">
						<p className="mb-2 text-sm font-medium text-gray-600">
							Small
						</p>
						<p className="text-xs text-gray-500">shadow-sm</p>
					</div>
					<div className="rounded-lg bg-white p-6 shadow">
						<p className="mb-2 text-sm font-medium text-gray-600">
							Default
						</p>
						<p className="text-xs text-gray-500">shadow</p>
					</div>
					<div className="rounded-lg bg-white p-6 shadow-md">
						<p className="mb-2 text-sm font-medium text-gray-600">
							Medium
						</p>
						<p className="text-xs text-gray-500">shadow-md</p>
					</div>
					<div className="rounded-lg bg-white p-6 shadow-lg">
						<p className="mb-2 text-sm font-medium text-gray-600">
							Large
						</p>
						<p className="text-xs text-gray-500">shadow-lg</p>
					</div>
					<div className="rounded-lg bg-white p-6 shadow-xl">
						<p className="mb-2 text-sm font-medium text-gray-600">
							Extra Large
						</p>
						<p className="text-xs text-gray-500">shadow-xl</p>
					</div>
					<div className="rounded-lg bg-white p-6 shadow-2xl">
						<p className="mb-2 text-sm font-medium text-gray-600">
							2X Large
						</p>
						<p className="text-xs text-gray-500">shadow-2xl</p>
					</div>
					<div className="rounded-lg bg-white p-6 shadow-inner">
						<p className="mb-2 text-sm font-medium text-gray-600">
							Inner
						</p>
						<p className="text-xs text-gray-500">shadow-inner</p>
					</div>
				</div>
			</section>
		</div>
	)
}

export const BorderRadius: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<section>
				<h2 className="mb-6 text-2xl font-bold">Border Radius</h2>
				<div className="grid grid-cols-4 gap-6">
					<div className="text-center">
						<div className="mx-auto mb-2 h-24 w-24 bg-blue-500"></div>
						<p className="text-sm font-medium">None</p>
						<p className="text-xs text-gray-500">rounded-none</p>
					</div>
					<div className="text-center">
						<div className="mx-auto mb-2 h-24 w-24 rounded-sm bg-blue-500"></div>
						<p className="text-sm font-medium">Small</p>
						<p className="text-xs text-gray-500">
							rounded-sm (2px)
						</p>
					</div>
					<div className="text-center">
						<div className="mx-auto mb-2 h-24 w-24 rounded bg-blue-500"></div>
						<p className="text-sm font-medium">Default</p>
						<p className="text-xs text-gray-500">rounded (4px)</p>
					</div>
					<div className="text-center">
						<div className="mx-auto mb-2 h-24 w-24 rounded-md bg-blue-500"></div>
						<p className="text-sm font-medium">Medium</p>
						<p className="text-xs text-gray-500">
							rounded-md (6px)
						</p>
					</div>
					<div className="text-center">
						<div className="mx-auto mb-2 h-24 w-24 rounded-lg bg-blue-500"></div>
						<p className="text-sm font-medium">Large</p>
						<p className="text-xs text-gray-500">
							rounded-lg (8px)
						</p>
					</div>
					<div className="text-center">
						<div className="mx-auto mb-2 h-24 w-24 rounded-xl bg-blue-500"></div>
						<p className="text-sm font-medium">Extra Large</p>
						<p className="text-xs text-gray-500">
							rounded-xl (12px)
						</p>
					</div>
					<div className="text-center">
						<div className="mx-auto mb-2 h-24 w-24 rounded-2xl bg-blue-500"></div>
						<p className="text-sm font-medium">2X Large</p>
						<p className="text-xs text-gray-500">
							rounded-2xl (16px)
						</p>
					</div>
					<div className="text-center">
						<div className="mx-auto mb-2 h-24 w-24 rounded-full bg-blue-500"></div>
						<p className="text-sm font-medium">Full</p>
						<p className="text-xs text-gray-500">rounded-full</p>
					</div>
				</div>
			</section>
		</div>
	)
}

export const HoverEffects: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<section>
				<h2 className="mb-6 text-2xl font-bold">Hover Effects</h2>
				<div className="grid grid-cols-3 gap-6">
					<div className="cursor-pointer rounded-lg border bg-white p-6 transition-shadow hover:shadow-lg">
						<h3 className="mb-2 font-semibold">
							Elevation on Hover
						</h3>
						<p className="text-sm text-gray-600">hover:shadow-lg</p>
					</div>
					<div className="cursor-pointer rounded-lg border bg-white p-6 transition-colors hover:bg-gray-50">
						<h3 className="mb-2 font-semibold">
							Background on Hover
						</h3>
						<p className="text-sm text-gray-600">
							hover:bg-gray-50
						</p>
					</div>
					<div className="cursor-pointer rounded-lg border bg-white p-6 transition-all hover:scale-105">
						<h3 className="mb-2 font-semibold">Scale on Hover</h3>
						<p className="text-sm text-gray-600">hover:scale-105</p>
					</div>
					<div className="hover:border-brand-500 cursor-pointer rounded-lg border border-gray-300 bg-white p-6 transition-colors">
						<h3 className="mb-2 font-semibold">
							Border Color on Hover
						</h3>
						<p className="text-sm text-gray-600">
							hover:border-brand-500
						</p>
					</div>
					<div className="cursor-pointer rounded-lg bg-blue-600 p-6 text-white transition-colors hover:bg-blue-700">
						<h3 className="mb-2 font-semibold">Darken on Hover</h3>
						<p className="text-sm">hover:bg-blue-700</p>
					</div>
					<div className="cursor-pointer rounded-lg border bg-white p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
						<h3 className="mb-2 font-semibold">Lift on Hover</h3>
						<p className="text-sm text-gray-600">
							hover:-translate-y-1
						</p>
					</div>
				</div>
			</section>
		</div>
	)
}

export const FocusStates: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<section>
				<h2 className="mb-6 text-2xl font-bold">Focus States</h2>
				<div className="space-y-4">
					<div>
						<label className="mb-2 block text-sm font-medium">
							Default Focus Ring
						</label>
						<input
							className="rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
							placeholder="Click to see focus ring"
						/>
						<p className="mt-1 text-xs text-gray-500">
							focus:ring-2 focus:ring-blue-500
						</p>
					</div>
					<div>
						<label className="mb-2 block text-sm font-medium">
							Focus with Offset
						</label>
						<input
							className="rounded-md border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
							placeholder="Click to see focus ring with offset"
						/>
						<p className="mt-1 text-xs text-gray-500">
							focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
						</p>
					</div>
					<div>
						<label className="mb-2 block text-sm font-medium">
							Focus with Border Color
						</label>
						<input
							className="focus:border-brand-500 rounded-md border px-3 py-2 focus:outline-none"
							placeholder="Click to see border color change"
						/>
						<p className="mt-1 text-xs text-gray-500">
							focus:border-brand-500
						</p>
					</div>
					<div className="flex gap-3">
						<button className="rounded-md bg-blue-600 px-4 py-2 text-white focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none">
							Primary Button
						</button>
						<button className="rounded-md border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none">
							Secondary Button
						</button>
					</div>
				</div>
			</section>
		</div>
	)
}

export const AnimationDurations: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<section>
				<h2 className="mb-6 text-2xl font-bold">Animation Durations</h2>
				<div className="space-y-4">
					<div className="flex items-center gap-4">
						<div className="h-20 w-20 rounded bg-blue-500 transition-all duration-75 hover:scale-110"></div>
						<div>
							<p className="font-medium">Ultra Fast</p>
							<p className="text-sm text-gray-600">
								duration-75 (75ms)
							</p>
						</div>
					</div>
					<div className="flex items-center gap-4">
						<div className="h-20 w-20 rounded bg-emerald-500 transition-all duration-150 hover:scale-110"></div>
						<div>
							<p className="font-medium">Fast</p>
							<p className="text-sm text-gray-600">
								duration-150 (150ms)
							</p>
						</div>
					</div>
					<div className="flex items-center gap-4">
						<div className="h-20 w-20 rounded bg-amber-500 transition-all duration-300 hover:scale-110"></div>
						<div>
							<p className="font-medium">Normal</p>
							<p className="text-sm text-gray-600">
								duration-300 (300ms) - Default
							</p>
						</div>
					</div>
					<div className="flex items-center gap-4">
						<div className="h-20 w-20 rounded bg-purple-500 transition-all duration-500 hover:scale-110"></div>
						<div>
							<p className="font-medium">Slow</p>
							<p className="text-sm text-gray-600">
								duration-500 (500ms)
							</p>
						</div>
					</div>
					<div className="flex items-center gap-4">
						<div className="h-20 w-20 rounded bg-red-500 transition-all duration-700 hover:scale-110"></div>
						<div>
							<p className="font-medium">Slower</p>
							<p className="text-sm text-gray-600">
								duration-700 (700ms)
							</p>
						</div>
					</div>
				</div>
				<p className="mt-6 text-sm text-gray-600">
					Hover over the squares to see the animation duration in
					action.
				</p>
			</section>
		</div>
	)
}

export const ComponentExamples: Story = {
	render: () => (
		<div className="space-y-8 bg-gray-50 p-8">
			<section>
				<h2 className="mb-6 text-2xl font-bold">
					Real Component Examples
				</h2>
				<div className="space-y-6">
					{/* Card with hover effect */}
					<div className="cursor-pointer rounded-lg bg-white p-6 shadow-md transition-shadow duration-300 hover:shadow-xl">
						<h3 className="mb-2 text-lg font-semibold">
							Interactive Card
						</h3>
						<p className="text-gray-600">
							This card elevates on hover with smooth transition
						</p>
					</div>

					{/* Button group */}
					<div className="rounded-lg bg-white p-6">
						<h3 className="mb-4 text-lg font-semibold">
							Button States
						</h3>
						<div className="flex gap-3">
							<button className="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-150 hover:bg-blue-700 active:bg-blue-800">
								Primary
							</button>
							<button className="rounded-md border border-gray-300 px-4 py-2 transition-colors duration-150 hover:bg-gray-50 active:bg-gray-100">
								Secondary
							</button>
							<button className="rounded-md px-4 py-2 text-blue-600 transition-colors duration-150 hover:bg-blue-50">
								Text Button
							</button>
						</div>
					</div>

					{/* Modal-like component */}
					<div className="mx-auto max-w-md rounded-xl bg-white p-8 shadow-2xl">
						<h3 className="mb-4 text-xl font-bold">Modal Shadow</h3>
						<p className="mb-6 text-gray-600">
							This uses shadow-2xl for maximum elevation,
							typically used for modals and overlays.
						</p>
						<div className="flex gap-3">
							<button className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white">
								Confirm
							</button>
							<button className="flex-1 rounded-md border border-gray-300 px-4 py-2">
								Cancel
							</button>
						</div>
					</div>
				</div>
			</section>
		</div>
	)
}
