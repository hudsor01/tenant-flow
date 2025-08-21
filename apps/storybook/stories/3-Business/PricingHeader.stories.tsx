import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PricingHeader } from '../../../../apps/frontend/src/components/pricing/pricing-header'

const meta = {
	title: 'Business/Pricing/PricingHeader',
	component: PricingHeader,
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component: `
Pricing page header component with trust indicators and value proposition.

**Key Features:**
- Eye-catching gradient headline
- Trust indicators with icons
- Key benefits grid
- Professional badge styling
- Responsive design for all screen sizes

**Usage:**
This component serves as the hero section for the pricing page, establishing trust and value.
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
} satisfies Meta<typeof PricingHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {},
	parameters: {
		docs: {
			description: {
				story: 'Default pricing header with full trust indicators and benefits'
			}
		}
	}
}

export const WithCustomStyling: Story = {
	args: {
		className: 'bg-gradient-to-b from-blue-50 to-white'
	},
	parameters: {
		docs: {
			description: {
				story: 'Pricing header with custom gradient background'
			}
		}
	}
}

export const Minimal: Story = {
	args: {
		className: 'mb-8'
	},
	parameters: {
		docs: {
			description: {
				story: 'More minimal version with reduced bottom margin'
			}
		}
	}
}
