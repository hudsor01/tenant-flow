import type { Meta, StoryObj } from '@storybook/react'
import { PricingFAQ } from '../../../../apps/frontend/src/components/pricing/pricing-faq'

const meta = {
  title: 'Business/Pricing/PricingFAQ',
  component: PricingFAQ,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Pricing FAQ component with interactive accordion functionality.

**Key Features:**
- Interactive accordion with smooth animations
- Common pricing and billing questions
- Clean card-based design
- Responsive layout
- Keyboard accessible

**Usage:**
This component addresses common customer concerns about pricing and billing.
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
} satisfies Meta<typeof PricingFAQ>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Default FAQ with interactive accordion functionality'
      }
    }
  }
}

export const WithCustomStyling: Story = {
  args: {
    className: 'bg-gray-50 p-8 rounded-lg'
  },
  parameters: {
    docs: {
      description: {
        story: 'FAQ with custom background and padding'
      }
    }
  }
}

export const Compact: Story = {
  args: {
    className: 'mt-8'
  },
  parameters: {
    docs: {
      description: {
        story: 'More compact version with reduced top margin'
      }
    }
  }
}