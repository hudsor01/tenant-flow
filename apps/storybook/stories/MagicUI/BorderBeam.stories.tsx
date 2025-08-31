import type { Meta, StoryObj } from '@storybook/react';
import { BorderBeam } from '@/components/magicui/border-beam';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const meta: Meta<typeof BorderBeam> = {
  title: 'Magic UI/Effects/Border Beam',
  component: BorderBeam,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'An animated beam of light that travels along the border of its container. Perfect for highlighting cards, buttons, or any container that needs attention.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'number',
      description: 'Size of the beam effect',
      defaultValue: 200,
    },
    duration: {
      control: 'number',
      description: 'Duration of the animation in seconds',
      defaultValue: 15,
    },
    anchor: {
      control: 'number',
      description: 'Anchor point for the beam (0-100)',
      defaultValue: 90,
    },
    borderWidth: {
      control: 'number',
      description: 'Width of the border beam',
      defaultValue: 1.5,
    },
    colorFrom: {
      control: 'color',
      description: 'Starting color of the beam',
      defaultValue: '#ffaa40',
    },
    colorTo: {
      control: 'color',
      description: 'Ending color of the beam',
      defaultValue: '#9c40ff',
    },
    delay: {
      control: 'number',
      description: 'Delay before animation starts',
      defaultValue: 0,
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper components for better demonstrations
const CardWithBorder = ({ children, ...beamProps }: any) => (
  <div className="relative">
    <Card className="w-80 h-48">
      <CardHeader>
        <CardTitle>Featured Card</CardTitle>
        <CardDescription>
          This card has an animated border beam effect
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          The beam travels around the border creating an eye-catching effect.
        </p>
      </CardContent>
    </Card>
    <BorderBeam {...beamProps} />
  </div>
);

const ButtonWithBorder = ({ children, ...beamProps }: any) => (
  <div className="relative">
    <Button size="lg" className="px-8 py-4">
      Premium Feature
    </Button>
    <BorderBeam {...beamProps} />
  </div>
);

export const Default: Story = {
  render: (args) => <CardWithBorder {...args} />,
  args: {},
};

export const OnButton: Story = {
  render: (args) => <ButtonWithBorder {...args} />,
  args: {},
  parameters: {
    docs: {
      description: {
        story: 'Border beam effect applied to a button for premium features.',
      },
    },
  },
};

export const FastAnimation: Story = {
  render: (args) => <CardWithBorder {...args} />,
  args: {
    duration: 5,
    colorFrom: '#00ff88',
    colorTo: '#0088ff',
  },
  parameters: {
    docs: {
      description: {
        story: 'Faster animation with blue-green gradient colors.',
      },
    },
  },
};

export const LargeBeam: Story = {
  render: (args) => <CardWithBorder {...args} />,
  args: {
    size: 400,
    borderWidth: 3,
    colorFrom: '#ff6b6b',
    colorTo: '#ffd93d',
  },
  parameters: {
    docs: {
      description: {
        story: 'Larger beam size with thicker border and warm colors.',
      },
    },
  },
};

export const SlowElegant: Story = {
  render: (args) => <CardWithBorder {...args} />,
  args: {
    duration: 25,
    colorFrom: '#a78bfa',
    colorTo: '#ec4899',
    anchor: 70,
  },
  parameters: {
    docs: {
      description: {
        story: 'Slow, elegant animation with purple-pink gradient.',
      },
    },
  },
};

export const DelayedStart: Story = {
  render: (args) => <CardWithBorder {...args} />,
  args: {
    delay: 2,
    colorFrom: '#fbbf24',
    colorTo: '#f59e0b',
  },
  parameters: {
    docs: {
      description: {
        story: 'Border beam with delayed start - useful for sequential animations.',
      },
    },
  },
};

export const MultipleCards: Story = {
  render: () => (
    <div className="flex gap-6">
      <div className="relative">
        <Card className="w-64 h-32">
          <CardHeader>
            <CardTitle className="text-lg">Plan A</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Basic features</p>
          </CardContent>
        </Card>
        <BorderBeam size={150} duration={10} colorFrom="#10b981" colorTo="#059669" />
      </div>
      
      <div className="relative">
        <Card className="w-64 h-32">
          <CardHeader>
            <CardTitle className="text-lg">Plan B</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Premium features</p>
          </CardContent>
        </Card>
        <BorderBeam size={150} duration={10} colorFrom="#3b82f6" colorTo="#1d4ed8" delay={1} />
      </div>
      
      <div className="relative">
        <Card className="w-64 h-32">
          <CardHeader>
            <CardTitle className="text-lg">Plan C</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">Enterprise features</p>
          </CardContent>
        </Card>
        <BorderBeam size={150} duration={10} colorFrom="#8b5cf6" colorTo="#7c3aed" delay={2} />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Multiple cards with staggered border beam animations - perfect for pricing tiers.',
      },
    },
  },
};