import type { Meta, StoryObj } from '@storybook/react'
import { StaticPricingGrid } from '../../../../apps/frontend/src/components/pricing/static-pricing-grid'

const meta = {
	title: 'Business/Pricing/StaticPricingGrid',
	component: StaticPricingGrid,
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component: `
Static pricing grid component that works without JavaScript - the foundation of progressive enhancement.

**Architecture Benefits:**
- Server-side rendered for immediate display
- Works completely without JavaScript
- SEO-friendly with all content in HTML
- Accessible by default
- Fast initial page load
- Progressive enhancement target

**Key Features:**
- All 4 pricing tiers displayed
- Static pricing information from configuration
- Direct signup links that work without JS
- Responsive grid layout
- Recommended and popular plan indicators
- Annual savings calculations

**Usage:**
This component serves as the base layer for the pricing page and fallback for interactive components.
Perfect for users with JavaScript disabled or slow connections.
        `
			}
		}
	},
	tags: ['autodocs'],
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes'
		},
		showRecommended: {
			control: 'boolean',
			description: 'Show recommended plan indicator'
		},
		showPopular: {
			control: 'boolean',
			description: 'Show popular plan indicator'
		}
	}
} satisfies Meta<typeof StaticPricingGrid>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		showRecommended: true,
		showPopular: true
	},
	parameters: {
		docs: {
			description: {
				story: 'Default static pricing grid with all indicators'
			}
		}
	}
}

export const WithoutIndicators: Story = {
	args: {
		showRecommended: false,
		showPopular: false
	},
	parameters: {
		docs: {
			description: {
				story: 'Clean pricing grid without recommended/popular indicators'
			}
		}
	}
}

export const RecommendedOnly: Story = {
	args: {
		showRecommended: true,
		showPopular: false
	},
	parameters: {
		docs: {
			description: {
				story: 'Pricing grid showing only recommended plan indicator'
			}
		}
	}
}

export const PopularOnly: Story = {
	args: {
		showRecommended: false,
		showPopular: true
	},
	parameters: {
		docs: {
			description: {
				story: 'Pricing grid showing only popular plan indicator'
			}
		}
	}
}

export const WithCustomStyling: Story = {
	args: {
		showRecommended: true,
		showPopular: true,
		className: 'bg-gradient-to-b from-blue-50 to-white'
	},
	parameters: {
		docs: {
			description: {
				story: 'Static pricing grid with custom gradient background'
			}
		}
	}
}

export const AccessibilityFocused: Story = {
	args: {
		showRecommended: true,
		showPopular: true
	},
	parameters: {
		docs: {
			description: {
				story: 'Demonstrates accessibility features - keyboard navigation and screen reader support'
			}
		}
	},
	decorators: [
		Story => (
			<div role="region" aria-label="Pricing plans">
				<Story />
			</div>
		)
	]
}
