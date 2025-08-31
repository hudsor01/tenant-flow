import type { Meta, StoryObj } from '@storybook/react';
import { RainbowButton } from '@/components/magicui/rainbow-button';

const meta: Meta<typeof RainbowButton> = {
  title: 'Magic UI/Buttons/Rainbow Button',
  component: RainbowButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An animated button with a rainbow border effect. Perfect for premium features, special offers, and call-to-action buttons that need maximum attention.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'outline'],
      description: 'Visual style variant',
      defaultValue: 'default',
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
      description: 'Button size',
      defaultValue: 'default',
    },
    children: {
      control: 'text',
      description: 'Button content',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Rainbow Button',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline Rainbow',
  },
  parameters: {
    docs: {
      description: {
        story: 'Outline variant with rainbow border effect.',
      },
    },
  },
};

export const PremiumUpgrade: Story = {
  args: {
    size: 'lg',
    children: (
      <>
        <div className="i-lucide-crown w-5 h-5" />
        Get Unlimited Access
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Large premium upgrade button with icon.',
      },
    },
  },
};

export const SmallAction: Story = {
  args: {
    size: 'sm',
    children: 'Upgrade Now',
  },
  parameters: {
    docs: {
      description: {
        story: 'Small rainbow button for inline actions.',
      },
    },
  },
};

export const IconOnly: Story = {
  args: {
    size: 'icon',
    children: <div className="i-lucide-star w-4 h-4" />,
  },
  parameters: {
    docs: {
      description: {
        story: 'Icon-only rainbow button for special actions.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    children: 'Disabled Rainbow',
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled state - rainbow effect is paused.',
      },
    },
  },
};

export const CallToAction: Story = {
  args: {
    size: 'lg',
    className: 'text-base font-semibold tracking-wide',
    children: (
      <>
        <div className="i-lucide-zap w-5 h-5" />
        Start Free Trial
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Primary call-to-action with rainbow effect to grab attention.',
      },
    },
  },
};

export const MultipleButtons: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <RainbowButton>Basic Plan</RainbowButton>
        <RainbowButton variant="outline">Pro Plan</RainbowButton>
        <RainbowButton size="lg">
          <div className="i-lucide-crown w-4 h-4" />
          Enterprise
        </RainbowButton>
      </div>
      
      <div className="flex gap-2">
        <RainbowButton size="sm">Small</RainbowButton>
        <RainbowButton>Medium</RainbowButton>
        <RainbowButton size="lg">Large</RainbowButton>
      </div>
      
      <div className="flex gap-4 items-center">
        <RainbowButton size="icon">
          <div className="i-lucide-star w-4 h-4" />
        </RainbowButton>
        <RainbowButton>
          <div className="i-lucide-zap w-4 h-4" />
          Special Offer
        </RainbowButton>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Showcase of different rainbow button combinations and sizes.',
      },
    },
  },
};