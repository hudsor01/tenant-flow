import type { Meta, StoryObj } from '@storybook/react'
import { UsageIndicator } from '../../../../apps/frontend/src/components/pricing/usage-indicator'

const meta = {
  title: 'Business/Pricing/UsageIndicator',
  component: UsageIndicator,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Usage indicator component that shows current usage against plan limits.

**Key Features:**
- Visual progress bars for each metric
- Warning states when approaching limits
- Color-coded status indicators
- Responsive design for mobile and desktop

**Usage:**
This component requires usage data fetched from the user subscription context hook.
        `
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    usageData: {
      control: 'object',
      description: 'Current usage metrics'
    },
    planLimits: {
      control: 'object',
      description: 'Plan limits for comparison'
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes'
    }
  }
} satisfies Meta<typeof UsageIndicator>

export default meta
type Story = StoryObj<typeof meta>

const mockUsageData = {
  properties: 15,
  units: 45,
  users: 3,
  storage: 2.5 // GB
}

const starterLimits = {
  properties: 25,
  units: 100,
  users: 5,
  storage: 5 // GB
}

const growthLimits = {
  properties: 100,
  units: 500,
  users: 15,
  storage: 25 // GB
}

export const Default: Story = {
  args: {
    usageData: mockUsageData,
    planLimits: starterLimits
  },
  parameters: {
    docs: {
      description: {
        story: 'Default usage indicator showing healthy usage levels'
      }
    }
  }
}

export const ApproachingLimits: Story = {
  args: {
    usageData: {
      properties: 22,
      units: 85,
      users: 4,
      storage: 4.2
    },
    planLimits: starterLimits
  },
  parameters: {
    docs: {
      description: {
        story: 'Usage indicator showing warning state when approaching plan limits'
      }
    }
  }
}

export const ExceedingLimits: Story = {
  args: {
    usageData: {
      properties: 30,
      units: 120,
      users: 6,
      storage: 6.5
    },
    planLimits: starterLimits
  },
  parameters: {
    docs: {
      description: {
        story: 'Usage indicator showing critical state when exceeding plan limits'
      }
    }
  }
}

export const GrowthPlan: Story = {
  args: {
    usageData: {
      properties: 45,
      units: 180,
      users: 8,
      storage: 12.3
    },
    planLimits: growthLimits
  },
  parameters: {
    docs: {
      description: {
        story: 'Usage indicator for Growth plan with moderate usage'
      }
    }
  }
}

export const MinimalUsage: Story = {
  args: {
    usageData: {
      properties: 2,
      units: 8,
      users: 1,
      storage: 0.5
    },
    planLimits: starterLimits
  },
  parameters: {
    docs: {
      description: {
        story: 'Usage indicator showing minimal usage (good for new users)'
      }
    }
  }
}