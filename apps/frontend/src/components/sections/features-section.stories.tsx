import type { Meta, StoryObj } from '@storybook/react'
import Navbar from '../navbar'
import FeaturesSection from './features-section'

const meta = {
	title: 'Marketing/Sections/Features',
	component: FeaturesSection,
	tags: ['autodocs'],
	parameters: { layout: 'fullscreen' },
	globals: { domain: 'marketing' }
} satisfies Meta<typeof FeaturesSection>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	render: () => (
		<main className="bg-clean-light dark:bg-clean-dark min-h-screen">
			<Navbar />
			<div className="pt-24">
				<FeaturesSection />
			</div>
		</main>
	)
}
