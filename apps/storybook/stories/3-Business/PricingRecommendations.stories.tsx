import type { Meta, StoryObj } from '@storybook/react'
import { PricingRecommendations } from '../../../../apps/frontend/src/components/pricing/pricing-recommendations'

const meta = {
	title: 'Business/Pricing/PricingRecommendations',
	component: PricingRecommendations,
	parameters: {
		layout: 'centered',
		docs: {
			description: {
				component: `
Pricing recommendations component that suggests optimal plans based on usage patterns.

**Key Features:**
- Smart plan recommendations based on current usage
- Cost savings calculations for annual plans
- Upgrade prompts when approaching limits
- Personalized messaging based on usage patterns

**Usage:**
This component analyzes user data to provide personalized plan recommendations.
        `
			}
		}
	},
	tags: ['autodocs'],
	argTypes: {
		currentPlan: {
			control: 'text',
			description: 'Current subscription plan'
		},
		usage: {
			control: 'object',
			description: 'Current usage metrics'
		},
		className: {
			control: 'text',
			description: 'Additional CSS classes'
		}
	}
} satisfies Meta<typeof PricingRecommendations>

export default meta
type Story = StoryObj<typeof meta>

const mockUsageData = {
	properties: 15,
	units: 45,
	users: 3,
	storage: 2.5,
	apiCalls: 1250
}

export const StarterToGrowth: Story = {
	args: {
		currentPlan: 'starter',
		usage: {
			properties: 22,
			units: 85,
			users: 4,
			storage: 4.2,
			apiCalls: 2100
		}
	},
	parameters: {
		docs: {
			description: {
				story: 'Recommendation to upgrade from Starter to Growth plan'
			}
		}
	}
}

export const GrowthToMax: Story = {
	args: {
		currentPlan: 'growth',
		usage: {
			properties: 85,
			units: 420,
			users: 12,
			storage: 20.5,
			apiCalls: 15000
		}
	},
	parameters: {
		docs: {
			description: {
				story: 'Recommendation to upgrade from Growth to TenantFlow Max'
			}
		}
	}
}

export const TrialToStarter: Story = {
	args: {
		currentPlan: 'trial',
		usage: mockUsageData
	},
	parameters: {
		docs: {
			description: {
				story: 'Recommendation for trial users to choose Starter plan'
			}
		}
	}
}

export const OptimalUsage: Story = {
	args: {
		currentPlan: 'growth',
		usage: {
			properties: 45,
			units: 180,
			users: 8,
			storage: 12.0,
			apiCalls: 8500
		}
	},
	parameters: {
		docs: {
			description: {
				story: 'User with optimal usage for their current plan (no upgrade needed)'
			}
		}
	}
}

export const AnnualSavings: Story = {
	args: {
		currentPlan: 'starter',
		usage: mockUsageData
	},
	parameters: {
		docs: {
			description: {
				story: 'Recommendation highlighting annual plan savings'
			}
		}
	}
}

export const ExceededLimits: Story = {
	args: {
		currentPlan: 'starter',
		usage: {
			properties: 35,
			units: 150,
			users: 7,
			storage: 8.5,
			apiCalls: 4800
		}
	},
	parameters: {
		docs: {
			description: {
				story: 'Urgent upgrade recommendation when limits are exceeded'
			}
		}
	}
}
