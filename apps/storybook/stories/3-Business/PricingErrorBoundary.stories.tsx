import type { Meta, StoryObj } from '@storybook/react'
import { PricingErrorBoundary, PricingUnavailable } from '../../../../apps/frontend/src/components/pricing/pricing-error-boundary'

// Component that throws an error for testing
const ErrorThrowingComponent = ({ shouldThrow = true, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage)
  }
  return <div className="p-8 text-green-600 font-semibold">✅ Component loaded successfully!</div>
}

const meta = {
  title: 'Business/Pricing/PricingErrorBoundary',
  component: PricingErrorBoundary,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: `
Specialized error boundary for pricing components with graceful fallbacks and error tracking.

**Enhanced Error Handling:**
- Graceful degradation to static content
- Automatic retry mechanisms with exponential backoff
- Error tracking and analytics integration
- User-friendly error messages
- Contact support integration
- Technical details for debugging

**Key Features:**
- Custom fallback components
- Retry functionality (up to 3 attempts)
- Error ID generation for support tickets
- Browser error tracking
- Analytics event logging
- Email support integration

**Usage:**
Wrap pricing components to provide robust error recovery and maintain user experience even when APIs fail.
        `
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    enableRetry: {
      control: 'boolean',
      description: 'Enable retry functionality'
    },
    showContactSupport: {
      control: 'boolean', 
      description: 'Show contact support button'
    },
    onError: {
      action: 'error occurred',
      description: 'Error callback function'
    }
  }
} satisfies Meta<typeof PricingErrorBoundary>

export default meta
type Story = StoryObj<typeof meta>

export const NoError: Story = {
  args: {
    enableRetry: true,
    showContactSupport: true,
    children: <ErrorThrowingComponent shouldThrow={false} />
  },
  parameters: {
    docs: {
      description: {
        story: 'Normal operation - no error boundary triggered'
      }
    }
  }
}

export const DefaultErrorState: Story = {
  args: {
    enableRetry: true,
    showContactSupport: true,
    children: <ErrorThrowingComponent shouldThrow={true} errorMessage="Failed to load pricing data" />
  },
  parameters: {
    docs: {
      description: {
        story: 'Default error state with retry and support options'
      }
    }
  }
}

export const CustomFallback: Story = {
  args: {
    enableRetry: true,
    showContactSupport: true,
    fallback: <PricingUnavailable />,
    children: <ErrorThrowingComponent shouldThrow={true} />
  },
  parameters: {
    docs: {
      description: {
        story: 'Error boundary with custom fallback component'
      }
    }
  }
}

export const NoRetryOption: Story = {
  args: {
    enableRetry: false,
    showContactSupport: true,
    children: <ErrorThrowingComponent shouldThrow={true} errorMessage="Critical pricing service error" />
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state without retry option (for critical errors)'
      }
    }
  }
}

export const NoSupportOption: Story = {
  args: {
    enableRetry: true,
    showContactSupport: false,
    children: <ErrorThrowingComponent shouldThrow={true} errorMessage="Temporary pricing unavailable" />
  },
  parameters: {
    docs: {
      description: {
        story: 'Error state without support contact option'
      }
    }
  }
}

export const MinimalErrorState: Story = {
  args: {
    enableRetry: false,
    showContactSupport: false,
    children: <ErrorThrowingComponent shouldThrow={true} />
  },
  parameters: {
    docs: {
      description: {
        story: 'Minimal error state with no interactive options'
      }
    }
  }
}

export const NetworkError: Story = {
  args: {
    enableRetry: true,
    showContactSupport: true,
    children: <ErrorThrowingComponent shouldThrow={true} errorMessage="Network request failed: Unable to connect to pricing service" />
  },
  parameters: {
    docs: {
      description: {
        story: 'Network-specific error scenario'
      }
    }
  }
}

export const AuthenticationError: Story = {
  args: {
    enableRetry: false,
    showContactSupport: true,
    children: <ErrorThrowingComponent shouldThrow={true} errorMessage="Authentication failed: Invalid API credentials" />
  },
  parameters: {
    docs: {
      description: {
        story: 'Authentication error (retry disabled)'
      }
    }
  }
}

// Standalone fallback component stories
export const PricingUnavailableStandalone: StoryObj<typeof PricingUnavailable> = {
  render: () => <PricingUnavailable />,
  parameters: {
    docs: {
      description: {
        story: 'Standalone pricing unavailable component'
      }
    }
  }
}