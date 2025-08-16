import type { Meta, StoryObj } from '@storybook/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InteractivePricingTable } from '../../../../apps/frontend/src/components/pricing/interactive-pricing-table'

// Mock query client for Storybook
const createMockQueryClient = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false
			}
		}
	})

	// Pre-populate with mock data
	queryClient.setQueryData(['pricing-page-data'], {
		products: [
			{
				id: 'prod_starter',
				name: 'Starter',
				description: 'Perfect for getting started',
				active: true,
				metadata: {}
			},
			{
				id: 'prod_growth',
				name: 'Growth',
				description: 'Scale your business',
				active: true,
				metadata: {}
			}
		],
		prices: [
			{
				id: 'price_starter_monthly',
				product_id: 'prod_starter',
				currency: 'usd',
				unit_amount: 2900,
				recurring_interval: 'month',
				active: true
			},
			{
				id: 'price_starter_yearly',
				product_id: 'prod_starter',
				currency: 'usd',
				unit_amount: 29000,
				recurring_interval: 'year',
				active: true
			}
		],
		subscription: null,
		usage: {
			properties: 2,
			units: 8,
			users: 1,
			storage: 1024,
			apiCalls: 150
		},
		limits: { exceeded: false, limits: [], warningLimits: [] },
		recommendations: {
			suggested: 'STARTER',
			shouldUpgrade: false,
			annualSavings: {},
			urgentUpgrade: false
		},
		meta: {
			loadTime: 245,
			cacheHit: false,
			lastUpdated: '2024-12-13T18:00:00Z'
		}
	})

	return queryClient
}

const meta = {
	title: 'Business/Pricing/InteractivePricingTable',
	component: InteractivePricingTable,
	decorators: [
		Story => {
			const queryClient = createMockQueryClient()
			return (
				<QueryClientProvider client={queryClient}>
					<Story />
				</QueryClientProvider>
			)
		}
	],
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component: `
Enhanced interactive pricing table with progressive enhancement and error boundaries.

**Architecture Improvements:**
- Server-first rendering with client enhancement
- Multi-layer caching (memory, browser, edge)
- Specialized error boundaries with graceful fallbacks
- Lazy loading of heavy components
- Performance monitoring and analytics

**Key Features:**
- Progressive enhancement (works without JavaScript)
- Stripe pricing table integration
- Real-time usage data from Supabase
- Smart recommendations based on usage
- Error recovery with retry mechanisms
- Performance tracking and optimization

**Components Included:**
- StaticPricingGrid: Server-rendered fallback
- StripePricingTable: Enhanced Stripe integration
- UsageIndicator: Current usage visualization
- PricingRecommendations: AI-powered suggestions
- PricingErrorBoundary: Specialized error handling

**Usage:**
This is the enhanced interactive component for the pricing page with full error recovery.
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
		enableStripeTable: {
			control: 'boolean',
			description: 'Enable Stripe pricing table integration'
		},
		showUsageIndicator: {
			control: 'boolean',
			description: 'Show usage indicator for existing users'
		},
		showRecommendations: {
			control: 'boolean',
			description: 'Show smart plan recommendations'
		}
	}
} satisfies Meta<typeof InteractivePricingTable>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		enableStripeTable: true,
		showUsageIndicator: true,
		showRecommendations: true
	},
	parameters: {
		docs: {
			description: {
				story: 'Full interactive pricing table with all features enabled'
			}
		}
	}
}

export const StaticFallback: Story = {
	args: {
		enableStripeTable: false,
		showUsageIndicator: false,
		showRecommendations: false
	},
	parameters: {
		docs: {
			description: {
				story: 'Static pricing grid fallback (no JavaScript required)'
			}
		}
	}
}

export const MinimalInteractive: Story = {
	args: {
		enableStripeTable: true,
		showUsageIndicator: false,
		showRecommendations: false
	},
	parameters: {
		docs: {
			description: {
				story: 'Stripe table only without usage indicators or recommendations'
			}
		}
	}
}

export const ExistingUserView: Story = {
	args: {
		enableStripeTable: true,
		showUsageIndicator: true,
		showRecommendations: true,
		className: 'existing-user-context'
	},
	parameters: {
		docs: {
			description: {
				story: 'Full view for existing users with usage tracking and recommendations'
			}
		}
	}
}

export const ErrorState: Story = {
	args: {
		enableStripeTable: true,
		showUsageIndicator: true,
		showRecommendations: true
	},
	parameters: {
		docs: {
			description: {
				story: 'Error boundary demonstration with graceful fallback to static grid'
			}
		}
	},
	decorators: [
		Story => {
			// Simulate error condition
			const ErrorSimulator = () => {
				throw new Error('Simulated pricing data error')
			}

			return (
				<div>
					<ErrorSimulator />
					<Story />
				</div>
			)
		}
	]
}
