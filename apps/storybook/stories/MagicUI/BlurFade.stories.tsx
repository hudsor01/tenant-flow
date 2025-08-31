import type { Meta, StoryObj } from '@storybook/react';
import { BlurFade } from '@/components/magicui/blur-fade';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof BlurFade> = {
  title: 'Magic UI/Animations/Blur Fade',
  component: BlurFade,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'Blur fade in and out animation. Used to smoothly fade in and out content with a blur effect. Perfect for page transitions and content reveals.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    delay: {
      control: 'number',
      description: 'Delay before animation starts (in seconds)',
      defaultValue: 0,
    },
    duration: {
      control: 'number',
      description: 'Duration of the animation (in seconds)',
      defaultValue: 0.4,
    },
    yOffset: {
      control: 'number',
      description: 'Vertical offset distance in pixels',
      defaultValue: 6,
    },
    inView: {
      control: 'boolean',
      description: 'Whether the element should animate when in view',
      defaultValue: false,
    },
    blur: {
      control: 'text',
      description: 'Initial blur amount',
      defaultValue: '6px',
    },
    children: {
      control: false,
      description: 'Content to animate',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <Card className="w-80">
        <CardHeader>
          <CardTitle>Blur Fade Animation</CardTitle>
          <CardDescription>
            This content fades in with a blur effect
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Perfect for smooth content transitions and reveals.
          </p>
        </CardContent>
      </Card>
    ),
  },
};

export const WithDelay: Story = {
  args: {
    delay: 1,
    children: (
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Delayed Animation</h2>
        <p className="text-muted-foreground">This appears after 1 second delay</p>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Animation with a 1-second delay - useful for sequential reveals.',
      },
    },
  },
};

export const SlowAnimation: Story = {
  args: {
    duration: 1.5,
    children: (
      <Button size="lg" className="px-8">
        Slow Fade Button
      </Button>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Slower animation for more dramatic effect.',
      },
    },
  },
};

export const LargeOffset: Story = {
  args: {
    yOffset: 50,
    duration: 0.8,
    children: (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-lg text-white text-center">
        <h3 className="text-xl font-semibold">Large Offset</h3>
        <p className="mt-2">Slides up from 50px below</p>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Animation with larger vertical offset for more dramatic entrance.',
      },
    },
  },
};

export const HeavyBlur: Story = {
  args: {
    blur: '20px',
    duration: 1,
    children: (
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
          Heavy Blur Effect
        </h2>
        <p className="mt-2 text-muted-foreground">Starts with intense blur</p>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Animation starting with heavy blur for dramatic reveals.',
      },
    },
  },
};

export const SequentialCards: Story = {
  render: () => (
    <div className="space-y-4">
      {[0, 0.2, 0.4, 0.6].map((delay, index) => (
        <BlurFade key={index} delay={delay} duration={0.6}>
          <Card className="w-96">
            <CardHeader>
              <CardTitle>Feature {index + 1}</CardTitle>
              <CardDescription>
                This card appears with {delay}s delay
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Sequential animations create engaging user experiences.
              </p>
            </CardContent>
          </Card>
        </BlurFade>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Sequential cards with staggered blur fade animations - perfect for feature lists.',
      },
    },
  },
};

export const TextReveal: Story = {
  render: () => (
    <div className="text-center space-y-4">
      <BlurFade delay={0}>
        <h1 className="text-4xl font-bold">Welcome to</h1>
      </BlurFade>
      <BlurFade delay={0.3}>
        <h2 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          TenantFlow
        </h2>
      </BlurFade>
      <BlurFade delay={0.6}>
        <p className="text-xl text-muted-foreground">
          Transform your property management experience
        </p>
      </BlurFade>
      <BlurFade delay={0.9}>
        <Button size="lg" className="mt-4">
          Get Started Today
        </Button>
      </BlurFade>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Progressive text reveal animation - perfect for hero sections and landing pages.',
      },
    },
  },
};