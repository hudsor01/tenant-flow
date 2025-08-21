import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CustomerTestimonials } from '../../../../apps/frontend/src/components/pricing/customer-testimonials'

const meta = {
	title: 'Business/Pricing/CustomerTestimonials',
	component: CustomerTestimonials,
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component: `
Customer testimonials component that displays social proof and success stories.

**Key Features:**
- Real customer testimonials with ratings
- Statistics showing platform growth
- Plan-specific success stories
- Professional customer cards with avatars
- Call-to-action section

**Usage:**
This component builds trust by showing real customer experiences across different plan tiers.
        `
			}
		}
	},
	tags: ['autodocs'],
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes'
		}
	}
} satisfies Meta<typeof CustomerTestimonials>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {},
	parameters: {
		docs: {
			description: {
				story: 'Default testimonials with stats and customer success stories'
			}
		}
	}
}

export const WithCustomStyling: Story = {
	args: {
		className: 'bg-gradient-to-b from-white to-gray-50'
	},
	parameters: {
		docs: {
			description: {
				story: 'Testimonials with gradient background styling'
			}
		}
	}
}

export const Compact: Story = {
	args: {
		className: 'py-8'
	},
	parameters: {
		docs: {
			description: {
				story: 'More compact version with reduced spacing'
			}
		}
	}
}
