import type { Meta, StoryObj } from '@storybook/react';

// Simple Button component example  
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

const Button = ({ variant = 'primary', size = 'md', children, onClick, disabled }: ButtonProps) => {
  const baseStyles = 'font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors';
  
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive playground - you can edit props in real-time
export const Playground: Story = {
  args: {
    children: 'Click me!',
    variant: 'primary',
    size: 'md',
    disabled: false,
  },
};

// All variants at once for visual comparison
export const AllVariants: Story = {
  render: () => (
    <div className="space-x-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

// All sizes for comparison
export const AllSizes: Story = {
  render: () => (
    <div className="space-x-4 items-center flex">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

// States demonstration
export const States: Story = {
  render: () => (
    <div className="space-x-4">
      <Button>Normal</Button>
      <Button disabled>Disabled</Button>
      <Button onClick={() => alert('Clicked!')}>With Action</Button>
    </div>
  ),
};

// Real TenantFlow use cases
export const TenantFlowExamples: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="space-x-4">
        <Button variant="primary">Pay Rent</Button>
        <Button variant="secondary">View Lease</Button>
        <Button variant="danger">Report Emergency</Button>
      </div>
      
      <div className="space-x-4">
        <Button size="sm">Quick Action</Button>
        <Button size="lg">Important CTA</Button>
      </div>
      
      <div>
        <Button disabled>Processing Payment...</Button>
      </div>
    </div>
  ),
};