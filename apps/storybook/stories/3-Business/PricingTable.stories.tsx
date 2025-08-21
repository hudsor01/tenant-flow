import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PricingTable } from '../../../../apps/frontend/src/components/pricing/pricing-table'

const meta = {
	title: 'Business/Pricing/PricingTable',
	component: PricingTable,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
Stripe Pricing Table component that embeds Stripe's native pricing table.

**Key Features:**
- Real-time pricing from Stripe
- Professional, conversion-optimized design
- Mobile responsive
- Automatic customer email pre-filling
- Support for existing customer sessions

**Usage:**
This component requires NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variables.
        `
			}
		}
	},
	tags: ['autodocs'],
	argTypes: {
		pricingTableId: {
			control: 'text',
			description: 'Stripe pricing table ID from dashboard'
		},
		customerEmail: {
			control: 'text',
			description: 'Pre-fill customer email'
		},
		customerSessionClientSecret: {
			control: 'text',
			description: 'Customer session secret for existing customers'
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes'
		}
	}
} satisfies Meta<typeof PricingTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {},
	parameters: {
		docs: {
			description: {
				story: 'Default pricing table without customer information'
			}
		}
	}
}

export const WithCustomerEmail: Story = {
	args: {
		customerEmail: 'john.doe@example.com'
	},
	parameters: {
		docs: {
			description: {
				story: 'Pricing table with pre-filled customer email'
			}
		}
	}
}

export const WithCustomPricingTableId: Story = {
	args: {
		pricingTableId: 'prctbl_test_12345',
		customerEmail: 'customer@company.com'
	},
	parameters: {
		docs: {
			description: {
				story: 'Pricing table with custom table ID (for testing different configurations)'
			}
		}
	}
}

export const WithoutConfiguration: Story = {
	args: {
		pricingTableId: ''
	},
	parameters: {
		docs: {
			description: {
				story: 'Shows configuration error state when pricing table ID is missing'
			}
		}
	}
}

export const WithStyling: Story = {
	args: {
		customerEmail: 'styled@example.com',
		className: 'border-2 border-brand-500 rounded-lg p-4'
	},
	parameters: {
		docs: {
			description: {
				story: 'Pricing table with custom styling applied'
			}
		}
	}
}
