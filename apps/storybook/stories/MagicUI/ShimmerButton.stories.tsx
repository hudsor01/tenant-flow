import type { Meta, StoryObj } from '@storybook/react';
import { ShimmerButton } from '@/components/magicui/shimmer-button';

const meta: Meta<typeof ShimmerButton> = {
  title: 'Magic UI/Buttons/Shimmer Button',
  component: ShimmerButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A button with a shimmering light effect that travels around the perimeter. Perfect for call-to-action buttons and premium features.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    children: {
      control: 'text',
      description: 'Button content',
    },
    shimmerColor: {
      control: 'color',
      description: 'Color of the shimmer effect',
      defaultValue: '#ffffff',
    },
    shimmerSize: {
      control: 'text',
      description: 'Size of the shimmer effect',
      defaultValue: '0.05em',
    },
    shimmerDuration: {
      control: 'text',
      description: 'Duration of the shimmer animation',
      defaultValue: '3s',
    },
    borderRadius: {
      control: 'text',
      description: 'Border radius of the button',
      defaultValue: '100px',
    },
    background: {
      control: 'color',
      description: 'Background color of the button',
      defaultValue: 'rgba(0, 0, 0, 1)',
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
    children: 'Shimmer Button',
  },
};

export const GetStarted: Story = {
  args: {
    children: 'Get Started Free',
    className: 'px-8 py-4 text-lg font-semibold',
  },
  parameters: {
    docs: {
      description: {
        story: 'Primary call-to-action button with shimmer effect.',
      },
    },
  },
};

export const Premium: Story = {
  args: {
    children: 'Upgrade to Premium',
    shimmerColor: '#ffd700',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    className: 'px-6 py-3 font-medium',
  },
  parameters: {
    docs: {
      description: {
        story: 'Premium upgrade button with gold shimmer effect.',
      },
    },
  },
};

export const FastShimmer: Story = {
  args: {
    children: 'Quick Action',
    shimmerDuration: '1s',
    shimmerColor: '#00ff88',
  },
  parameters: {
    docs: {
      description: {
        story: 'Button with fast shimmer animation for urgent actions.',
      },
    },
  },
};

export const SlowElegant: Story = {
  args: {
    children: 'Elegant Choice',
    shimmerDuration: '5s',
    shimmerColor: '#ff6b6b',
    borderRadius: '8px',
    className: 'px-10 py-4 text-sm font-medium tracking-wider uppercase',
  },
  parameters: {
    docs: {
      description: {
        story: 'Slow, elegant shimmer animation with rounded corners.',
      },
    },
  },
};

export const CustomStyling: Story = {
  args: {
    children: 'Join Waitlist',
    shimmerColor: '#a78bfa',
    background: 'rgba(30, 30, 30, 0.8)',
    borderRadius: '12px',
    className: 'px-8 py-3 text-white backdrop-blur-sm border border-purple-500/20',
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom styled button with purple shimmer and glassmorphism effect.',
      },
    },
  },
};