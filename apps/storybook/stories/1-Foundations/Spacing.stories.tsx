import React from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'

const meta = {
	title: 'Foundations/Spacing',
	parameters: {
		layout: 'padded',
		docs: {
			description: {
				component:
					'8px grid system for consistent spacing throughout the application.'
			}
		}
	}
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const SpacingScale: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<section>
				<h2 className="mb-6 text-2xl font-bold">
					Spacing Scale (8px Grid)
				</h2>
				<div className="space-y-3">
					{[
						0, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 32,
						40, 48, 56, 64
					].map(space => (
						<div key={space} className="flex items-center gap-4">
							<span className="w-20 font-mono text-sm text-gray-600">
								{space} ({space * 4}px)
							</span>
							<div
								className="h-8 bg-blue-500 transition-all hover:bg-blue-600"
								style={{ width: `${space * 4}px` }}
							/>
							<span className="text-xs text-gray-500">
								{space === 0 && 'space-0'}
								{space === 0.5 && 'space-0.5'}
								{space > 0.5 && `space-${space}`}
							</span>
						</div>
					))}
				</div>
			</section>
		</div>
	)
}

export const PaddingExamples: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<section>
				<h2 className="mb-6 text-2xl font-bold">Padding Examples</h2>
				<div className="grid grid-cols-3 gap-6">
					<div className="border border-gray-300 bg-gray-50">
						<div className="bg-blue-100 p-2">
							<div className="bg-white p-2 text-center text-sm">
								p-2 (8px)
							</div>
						</div>
					</div>
					<div className="border border-gray-300 bg-gray-50">
						<div className="bg-blue-100 p-4">
							<div className="bg-white p-2 text-center text-sm">
								p-4 (16px)
							</div>
						</div>
					</div>
					<div className="border border-gray-300 bg-gray-50">
						<div className="bg-blue-100 p-6">
							<div className="bg-white p-2 text-center text-sm">
								p-6 (24px)
							</div>
						</div>
					</div>
					<div className="border border-gray-300 bg-gray-50">
						<div className="bg-blue-100 p-8">
							<div className="bg-white p-2 text-center text-sm">
								p-8 (32px)
							</div>
						</div>
					</div>
					<div className="border border-gray-300 bg-gray-50">
						<div className="bg-blue-100 px-8 py-4">
							<div className="bg-white p-2 text-center text-sm">
								px-8 py-4
							</div>
						</div>
					</div>
					<div className="border border-gray-300 bg-gray-50">
						<div className="bg-blue-100 px-4 pt-8 pb-2">
							<div className="bg-white p-2 text-center text-sm">
								pt-8 pb-2 px-4
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	)
}

export const MarginExamples: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<section>
				<h2 className="mb-6 text-2xl font-bold">
					Margin & Gap Examples
				</h2>
				<div className="space-y-8">
					<div>
						<h3 className="mb-4 font-medium">
							Margin Between Elements
						</h3>
						<div className="bg-gray-100 p-4">
							<div className="bg-blue-500 p-2 text-sm text-white">
								Element 1
							</div>
							<div className="mt-2 bg-blue-500 p-2 text-sm text-white">
								Element 2 (mt-2)
							</div>
							<div className="mt-4 bg-blue-500 p-2 text-sm text-white">
								Element 3 (mt-4)
							</div>
							<div className="mt-6 bg-blue-500 p-2 text-sm text-white">
								Element 4 (mt-6)
							</div>
						</div>
					</div>

					<div>
						<h3 className="mb-4 font-medium">Gap in Flex/Grid</h3>
						<div className="flex gap-4 bg-gray-100 p-4">
							<div className="flex-1 bg-emerald-500 p-4 text-center text-white">
								gap-4
							</div>
							<div className="flex-1 bg-emerald-500 p-4 text-center text-white">
								gap-4
							</div>
							<div className="flex-1 bg-emerald-500 p-4 text-center text-white">
								gap-4
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	)
}

export const ComponentSpacing: Story = {
	render: () => (
		<div className="space-y-8 p-8">
			<section>
				<h2 className="mb-6 text-2xl font-bold">
					Component Spacing Standards
				</h2>
				<div className="space-y-6">
					<div className="space-y-4 rounded-lg border p-6">
						<h3 className="font-semibold">Card Component</h3>
						<div className="bg-gray-50 p-1">
							<div className="rounded-lg border bg-white p-6">
								<div className="mb-2 font-medium">
									Card Title
								</div>
								<div className="text-sm text-gray-600">
									Standard card padding: p-6 (24px)
								</div>
							</div>
						</div>
					</div>

					<div className="space-y-4 rounded-lg border p-6">
						<h3 className="font-semibold">Button Group</h3>
						<div className="flex gap-2">
							<button className="rounded bg-blue-500 px-4 py-2 text-white">
								Button 1
							</button>
							<button className="rounded bg-gray-500 px-4 py-2 text-white">
								Button 2
							</button>
							<button className="rounded bg-gray-500 px-4 py-2 text-white">
								Button 3
							</button>
						</div>
						<p className="text-sm text-gray-600">
							Button group gap: gap-2 (8px)
						</p>
					</div>

					<div className="space-y-4 rounded-lg border p-6">
						<h3 className="font-semibold">Form Fields</h3>
						<div className="max-w-md space-y-4">
							<div>
								<label className="mb-1 block text-sm font-medium">
									Label
								</label>
								<input
									className="w-full rounded border px-3 py-2"
									placeholder="Input field"
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium">
									Label
								</label>
								<input
									className="w-full rounded border px-3 py-2"
									placeholder="Input field"
								/>
							</div>
						</div>
						<p className="text-sm text-gray-600">
							Form field spacing: space-y-4 (16px)
						</p>
					</div>
				</div>
			</section>
		</div>
	)
}
