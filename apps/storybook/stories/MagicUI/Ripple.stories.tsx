import type { Meta, StoryObj } from '@storybook/react';
import { Ripple } from '@/components/magicui/ripple';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof Ripple> = {
  title: 'Magic UI/Effects/Ripple',
  component: Ripple,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An animated ripple effect typically used behind elements to emphasize them. Creates a soothing, dynamic background that draws attention without being distracting.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    mainCircleSize: {
      control: 'number',
      description: 'Size of the main/innermost circle',
      defaultValue: 210,
    },
    mainCircleOpacity: {
      control: 'number',
      description: 'Opacity of the main circle',
      defaultValue: 0.24,
    },
    numCircles: {
      control: 'number',
      description: 'Number of ripple circles',
      defaultValue: 8,
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component for better demonstrations
const RippleContainer = ({ children, ...rippleProps }: any) => (
  <div className="relative flex h-[500px] w-full flex-col items-center justify-center overflow-hidden rounded-lg border bg-background">
    {children}
    <Ripple {...rippleProps} />
  </div>
);

export const Default: Story = {
  render: (args) => (
    <RippleContainer {...args}>
      <p className="z-10 whitespace-pre-wrap text-center text-5xl font-medium tracking-tighter text-white">
        Ripple
      </p>
    </RippleContainer>
  ),
  args: {},
};

export const WithCard: Story = {
  render: (args) => (
    <RippleContainer {...args}>
      <Card className="z-10 w-96">
        <CardHeader>
          <CardTitle>Featured Content</CardTitle>
          <CardDescription>
            This content is emphasized with a ripple effect
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            The ripple effect creates visual interest and draws attention to important content.
          </p>
          <Button>Learn More</Button>
        </CardContent>
      </Card>
    </RippleContainer>
  ),
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Ripple effect behind a card to create focus and emphasis.',
      },
    },
  },
};

export const SmallRipples: Story = {
  render: (args) => (
    <RippleContainer {...args}>
      <div className="z-10 text-center">
        <h2 className="text-3xl font-bold mb-2">Small Ripples</h2>
        <p className="text-muted-foreground">Subtle background animation</p>
      </div>
    </RippleContainer>
  ),
  args: {
    mainCircleSize: 120,
    numCircles: 6,
    mainCircleOpacity: 0.15,
  },
  parameters: {
    docs: {
      description: {
        story: 'Smaller, more subtle ripple effect for background ambiance.',
      },
    },
  },
};

export const LargeRipples: Story = {
  render: (args) => (
    <RippleContainer {...args}>
      <div className="z-10 text-center">
        <h2 className="text-4xl font-bold mb-2">Large Ripples</h2>
        <p className="text-muted-foreground">Dramatic background effect</p>
      </div>
    </RippleContainer>
  ),
  args: {
    mainCircleSize: 300,
    numCircles: 10,
    mainCircleOpacity: 0.3,
  },
  parameters: {
    docs: {
      description: {
        story: 'Larger ripple effect for hero sections and dramatic presentations.',
      },
    },
  },
};

export const FewCircles: Story = {
  render: (args) => (
    <RippleContainer {...args}>
      <div className="z-10 text-center">
        <h2 className="text-3xl font-bold mb-2">Minimal Ripples</h2>
        <p className="text-muted-foreground">Clean, minimal animation</p>
      </div>
    </RippleContainer>
  ),
  args: {
    numCircles: 4,
    mainCircleOpacity: 0.2,
  },
  parameters: {
    docs: {
      description: {
        story: 'Fewer circles for a cleaner, more minimal effect.',
      },
    },
  },
};

export const HighOpacity: Story = {
  render: (args) => (
    <RippleContainer {...args}>
      <div className="z-10 text-center">
        <h2 className="text-3xl font-bold mb-2 text-white">Bright Ripples</h2>
        <p className="text-gray-300">High opacity for dark backgrounds</p>
      </div>
    </RippleContainer>
  ),
  args: {
    mainCircleOpacity: 0.4,
  },
  parameters: {
    docs: {
      description: {
        story: 'Higher opacity ripples for dark backgrounds or when you need more visibility.',
      },
    },
  },
};

export const CallToActionSection: Story = {
  render: (args) => (
    <RippleContainer {...args}>
      <div className="z-10 text-center space-y-4">
        <h1 className="text-5xl font-bold text-white">
          Ready to Transform?
        </h1>
        <p className="text-xl text-gray-300">
          Experience the future of property management
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Button size="lg" className="bg-white text-black hover:bg-gray-100">
            Get Started Free
          </Button>
          <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-black">
            Learn More
          </Button>
        </div>
      </div>
    </RippleContainer>
  ),
  args: {
    mainCircleSize: 250,
    mainCircleOpacity: 0.3,
    numCircles: 8,
  },
  parameters: {
    docs: {
      description: {
        story: 'Ripple effect behind a call-to-action section for maximum impact.',
      },
    },
  },
};