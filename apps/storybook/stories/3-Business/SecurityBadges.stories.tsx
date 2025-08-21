import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { SecurityBadges } from '../../../../apps/frontend/src/components/pricing/security-badges'

const meta = {
	title: 'Business/Pricing/SecurityBadges',
	component: SecurityBadges,
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component: `
Security badges component that displays trust indicators and compliance certifications.

**Key Features:**
- Enterprise security certifications (SOC 2, ISO 27001, GDPR)
- Visual trust indicators with icons
- Detailed explanations of security measures
- Professional design that builds customer confidence

**Usage:**
This component is typically placed on pricing or landing pages to build trust.
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
} satisfies Meta<typeof SecurityBadges>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {},
	parameters: {
		docs: {
			description: {
				story: 'Default security badges with all certifications and trust indicators'
			}
		}
	}
}

export const WithCustomStyling: Story = {
	args: {
		className: 'bg-gray-50'
	},
	parameters: {
		docs: {
			description: {
				story: 'Security badges with custom background styling'
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
				story: 'More compact version with reduced padding'
			}
		}
	}
}
