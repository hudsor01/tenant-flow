import type { Meta, StoryObj } from '@storybook/react';
import { InteractiveHoverButton } from '@/components/magicui/interactive-hover-button';

const meta: Meta<typeof InteractiveHoverButton> = {
  title: 'Magic UI/Buttons/Interactive Hover Button',
  component: InteractiveHoverButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An interactive button with smooth hover animations and an arrow reveal effect. Perfect for navigation links and action buttons that need subtle, engaging interactions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'Button text content',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the button is disabled',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Hover Me',
  },
};

export const NavigationLink: Story = {
  args: {
    children: 'Learn More',
    className: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  },
  parameters: {
    docs: {
      description: {
        story: 'Navigation link style with custom colors.',
      },
    },
  },
};

export const CallToAction: Story = {
  args: {
    children: 'Get Started',
    className: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 px-8 py-3',
  },
  parameters: {
    docs: {
      description: {
        story: 'Call-to-action button with larger padding.',
      },
    },
  },
};

export const Premium: Story = {
  args: {
    children: 'Upgrade Now',
    className: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100 font-bold',
  },
  parameters: {
    docs: {
      description: {
        story: 'Premium upgrade button with purple theme.',
      },
    },
  },
};

export const Subtle: Story = {
  args: {
    children: 'View Details',
    className: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100 text-sm',
  },
  parameters: {
    docs: {
      description: {
        story: 'Subtle secondary button for less important actions.',
      },
    },
  },
};

export const Large: Story = {
  args: {
    children: 'Explore Features',
    className: 'px-10 py-4 text-lg font-semibold bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
  },
  parameters: {
    docs: {
      description: {
        story: 'Large interactive button for hero sections.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    children: 'Coming Soon',
    disabled: true,
    className: 'opacity-50 cursor-not-allowed',
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled state - interactions are prevented.',
      },
    },
  },
};

export const MultipleButtons: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <InteractiveHoverButton>Default</InteractiveHoverButton>
        <InteractiveHoverButton className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
          Learn More
        </InteractiveHoverButton>
        <InteractiveHoverButton className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100">
          Get Started
        </InteractiveHoverButton>
      </div>
      
      <div className="flex gap-4">
        <InteractiveHoverButton className="px-8 py-3 bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100">
          Premium Feature
        </InteractiveHoverButton>
        <InteractiveHoverButton className="px-6 py-2 text-sm bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100">
          Secondary Action
        </InteractiveHoverButton>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple interactive hover buttons with different styles and purposes.',
      },
    },
  },
};