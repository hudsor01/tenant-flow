import type { Meta, StoryObj } from '@storybook/react';
import { AnimatedGradientText } from '@/components/magicui/animated-gradient-text';

const meta: Meta<typeof AnimatedGradientText> = {
  title: 'Magic UI/Text Animations/Animated Gradient Text',
  component: AnimatedGradientText,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An animated gradient background which transitions between colors for text. Perfect for creating eye-catching headlines and brand text.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'The text content to display with animated gradient',
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
    children: 'Animated Gradient Text',
  },
};

export const LargeHeading: Story = {
  args: {
    children: 'Welcome to TenantFlow',
    className: 'text-6xl font-bold',
  },
  parameters: {
    docs: {
      description: {
        story: 'Large heading with animated gradient effect - perfect for hero sections.',
      },
    },
  },
};

export const CallToAction: Story = {
  args: {
    children: 'Get Started Today',
    className: 'text-2xl font-semibold',
  },
  parameters: {
    docs: {
      description: {
        story: 'Medium-sized call-to-action text with gradient animation.',
      },
    },
  },
};

export const SubtleAccent: Story = {
  args: {
    children: 'Premium Features',
    className: 'text-lg font-medium',
  },
  parameters: {
    docs: {
      description: {
        story: 'Smaller accent text with gradient effect for highlighting features.',
      },
    },
  },
};

export const MultiLine: Story = {
  args: {
    children: 'Transform your\nproperty management\nexperience',
    className: 'text-4xl font-bold whitespace-pre-line text-center',
  },
  parameters: {
    docs: {
      description: {
        story: 'Multi-line text with animated gradient effect.',
      },
    },
  },
};