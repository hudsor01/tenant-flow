import type { Meta, StoryObj } from '@storybook/react';

import { Input } from '../../../apps/frontend/src/components/ui/input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input System',
  component: Input,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: { type: 'select' },
      options: ['text', 'email', 'password', 'tel', 'search', 'url', 'number'],
    },
    floatingLabel: {
      control: 'boolean',
    },
    showValidation: {
      control: 'boolean',
    },
    characterCount: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic Input Types
export const AllTypes: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Standard Inputs</h3>
        <Input type="text" placeholder="Text input" />
        <Input type="email" placeholder="Email input" />
        <Input type="password" placeholder="Password input" />
        <Input type="tel" placeholder="Phone input" />
        <Input type="search" placeholder="Search input" />
        <Input type="number" placeholder="Number input" />
      </div>
    </div>
  ),
};

// Floating Label Variants
export const FloatingLabels: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Floating Label Inputs</h3>
        <Input 
          floatingLabel 
          label="Full Name" 
          placeholder="Enter your full name" 
        />
        <Input 
          floatingLabel 
          label="Email Address" 
          type="email" 
          placeholder="Enter your email" 
        />
        <Input 
          floatingLabel 
          label="Password" 
          type="password" 
          placeholder="Enter your password" 
        />
        <Input 
          floatingLabel 
          label="Phone Number" 
          type="tel" 
          placeholder="Enter your phone" 
        />
      </div>
    </div>
  ),
};

// Validation States
export const ValidationStates: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Validation States</h3>
        <Input 
          label="Valid Input" 
          defaultValue="valid@example.com" 
          success="Email address is valid"
        />
        <Input 
          label="Error Input" 
          defaultValue="invalid-email" 
          error="Please enter a valid email address"
        />
        <Input 
          floatingLabel
          label="Valid Floating" 
          defaultValue="John Doe" 
          success="Name looks good"
        />
        <Input 
          floatingLabel
          label="Error Floating" 
          error="This field is required"
        />
      </div>
    </div>
  ),
};

// Character Count & Max Length
export const CharacterCount: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Character Counting</h3>
        <Input 
          label="Bio (50 chars max)" 
          placeholder="Tell us about yourself..." 
          characterCount 
          maxLength={50}
        />
        <Input 
          floatingLabel
          label="Short Description" 
          placeholder="Brief description..." 
          characterCount 
          maxLength={100}
          defaultValue="This is a sample description that shows character counting"
        />
        <Input 
          label="Tweet (280 chars max)" 
          placeholder="What's happening?" 
          characterCount 
          maxLength={280}
          defaultValue="This input shows how character count changes color as you approach the limit"
        />
      </div>
    </div>
  ),
};

// Password Visibility
export const PasswordVisibility: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Password Fields</h3>
        <Input 
          type="password" 
          label="Standard Password" 
          placeholder="Enter password" 
          defaultValue="mySecretPassword"
        />
        <Input 
          type="password" 
          floatingLabel
          label="Floating Password" 
          placeholder="Enter password" 
          defaultValue="anotherSecret"
        />
        <Input 
          type="password" 
          label="Password with Validation" 
          placeholder="Create strong password" 
          error="Password must be at least 8 characters"
        />
      </div>
    </div>
  ),
};

// Disabled States
export const DisabledStates: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Disabled Inputs</h3>
        <Input 
          disabled
          label="Disabled Input" 
          placeholder="This is disabled" 
        />
        <Input 
          disabled
          floatingLabel
          label="Disabled Floating" 
          defaultValue="Cannot edit this"
        />
        <Input 
          disabled
          type="password" 
          label="Disabled Password" 
          defaultValue="hidden"
        />
      </div>
    </div>
  ),
};

// TenantFlow Forms
export const TenantFlowForms: Story = {
  render: () => (
    <div className="space-y-8 w-96">
      {/* Login Form */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Login Form</h3>
        <Input 
          floatingLabel
          label="Email" 
          type="email" 
          placeholder="Enter your email"
        />
        <Input 
          floatingLabel
          label="Password" 
          type="password" 
          placeholder="Enter your password"
        />
      </div>

      {/* Property Form */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Add Property Form</h3>
        <Input 
          label="Property Address" 
          placeholder="123 Main Street, Apt 4B"
        />
        <Input 
          label="Monthly Rent" 
          type="number" 
          placeholder="1500"
        />
        <Input 
          label="Bedrooms" 
          type="number" 
          placeholder="2"
        />
        <Input 
          label="Bathrooms" 
          type="number" 
          placeholder="1.5"
        />
      </div>

      {/* Tenant Contact Form */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Tenant Information</h3>
        <Input 
          floatingLabel
          label="Full Name" 
          placeholder="John Doe"
        />
        <Input 
          floatingLabel
          label="Email Address" 
          type="email" 
          placeholder="john@example.com"
        />
        <Input 
          floatingLabel
          label="Phone Number" 
          type="tel" 
          placeholder="(555) 123-4567"
        />
        <Input 
          floatingLabel
          label="Emergency Contact" 
          placeholder="Jane Doe - (555) 987-6543"
        />
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Search & Filters</h3>
        <Input 
          type="search" 
          placeholder="Search properties, tenants, or addresses..."
        />
        <Input 
          label="Min Rent" 
          type="number" 
          placeholder="500"
        />
        <Input 
          label="Max Rent" 
          type="number" 
          placeholder="2000"
        />
      </div>
    </div>
  ),
};

// Real-time Validation Examples
export const RealTimeValidation: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Real-time Validation</h3>
        <Input 
          floatingLabel
          label="Email Validation" 
          type="email" 
          placeholder="Enter valid email"
          error="Please enter a valid email address"
        />
        <Input 
          label="Phone Validation" 
          type="tel" 
          placeholder="(555) 123-4567"
          success="Phone number format is correct"
        />
        <Input 
          floatingLabel
          label="Strong Password" 
          type="password" 
          placeholder="Create password"
          characterCount
          maxLength={20}
          error="Password must contain uppercase, lowercase, number, and symbol"
        />
      </div>
    </div>
  ),
};

// Interactive Playground
export const Playground: Story = {
  args: {
    label: 'Input Label',
    placeholder: 'Enter text here...',
    type: 'text',
    floatingLabel: false,
    showValidation: true,
    characterCount: false,
    maxLength: 100,
    disabled: false,
    error: '',
    success: '',
  },
  render: (args) => (
    <div className="w-96">
      <Input {...args} />
    </div>
  ),
};