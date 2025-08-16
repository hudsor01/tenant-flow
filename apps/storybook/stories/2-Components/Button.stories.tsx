import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { Button, ButtonGroup, IconButton, CTAButton, LoadingButton, SplitButton, FloatingActionButton } from '@/components/ui/button';
import { 
  Plus, 
  Search, 
  Download, 
  Settings, 
  ChevronRight, 
  Heart,
  Star,
  Share2,
  Trash,
  Edit,
  Save,
  X
} from 'lucide-react';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Consolidated button system with all variants and patterns.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link', 'cta', 'success', 'warning'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'xl', 'icon'],
    },
    fullWidth: {
      control: 'boolean',
    },
    loading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    animate: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// Basic Button Variants
export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="cta">CTA</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="default">Default</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
      <Button size="icon" aria-label="Settings">
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  ),
};

// States
export const States: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Button>Normal</Button>
        <Button disabled>Disabled</Button>
        <Button loading>Loading</Button>
        <Button loading loadingText="Processing...">Submit</Button>
      </div>
      <div className="flex gap-4">
        <Button variant="outline">Normal</Button>
        <Button variant="outline" disabled>Disabled</Button>
        <Button variant="outline" loading>Loading</Button>
      </div>
    </div>
  ),
};

// Icons
export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button leftIcon={<Plus className="h-4 w-4" />}>Add Item</Button>
      <Button rightIcon={<ChevronRight className="h-4 w-4" />}>Continue</Button>
      <Button leftIcon={<Download className="h-4 w-4" />} rightIcon={<ChevronRight className="h-4 w-4" />}>
        Download
      </Button>
      <Button variant="destructive" leftIcon={<Trash className="h-4 w-4" />}>Delete</Button>
      <Button variant="success" leftIcon={<Save className="h-4 w-4" />}>Save</Button>
    </div>
  ),
};

// Icon Buttons
export const IconButtons: Story = {
  render: () => (
    <div className="flex gap-4">
      <IconButton icon={<Search className="h-4 w-4" />} label="Search" />
      <IconButton icon={<Heart className="h-4 w-4" />} label="Like" variant="outline" />
      <IconButton icon={<Settings className="h-4 w-4" />} label="Settings" variant="ghost" />
      <IconButton icon={<Star className="h-4 w-4" />} label="Favorite" variant="secondary" />
      <IconButton icon={<Share2 className="h-4 w-4" />} label="Share" rotate />
    </div>
  ),
};

// Button Groups
export const Groups: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-600 mb-2">Horizontal Group</p>
        <ButtonGroup>
          <Button variant="outline">Left</Button>
          <Button variant="outline">Center</Button>
          <Button variant="outline">Right</Button>
        </ButtonGroup>
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">Attached Group</p>
        <ButtonGroup attach>
          <Button variant="outline">First</Button>
          <Button variant="outline">Second</Button>
          <Button variant="outline">Third</Button>
        </ButtonGroup>
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-2">Vertical Group</p>
        <ButtonGroup orientation="vertical">
          <Button variant="outline" fullWidth>Top</Button>
          <Button variant="outline" fullWidth>Middle</Button>
          <Button variant="outline" fullWidth>Bottom</Button>
        </ButtonGroup>
      </div>
    </div>
  ),
};

// CTA Buttons
export const CTAButtons: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex gap-4">
        <CTAButton>Get Started</CTAButton>
        <CTAButton priority="secondary">Learn More</CTAButton>
      </div>
      <div className="flex gap-4">
        <CTAButton glow>Glowing CTA</CTAButton>
        <CTAButton pulse>Pulsing CTA</CTAButton>
        <CTAButton glow pulse>Glow + Pulse</CTAButton>
      </div>
    </div>
  ),
};

// Loading Buttons
export const LoadingVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <LoadingButton loading loadingVariant="spinner">Spinner</LoadingButton>
      <LoadingButton loading loadingVariant="dots">Dots</LoadingButton>
      <LoadingButton loading loadingVariant="shimmer">Shimmer</LoadingButton>
    </div>
  ),
};

// Split Button
export const SplitButtons: Story = {
  render: () => (
    <div className="flex gap-4">
      <SplitButton
        mainAction={{ label: 'Save', onClick: () => console.log('Save') }}
        dropdownActions={[
          { label: 'Save as draft', onClick: () => console.log('Draft'), icon: <Edit className="h-4 w-4" /> },
          { label: 'Save and publish', onClick: () => console.log('Publish'), icon: <Save className="h-4 w-4" /> },
          { label: 'Discard', onClick: () => console.log('Discard'), icon: <X className="h-4 w-4" />, destructive: true },
        ]}
      />
      <SplitButton
        variant="outline"
        mainAction={{ label: 'Export', onClick: () => console.log('Export') }}
        dropdownActions={[
          { label: 'Export as PDF', onClick: () => console.log('PDF') },
          { label: 'Export as CSV', onClick: () => console.log('CSV') },
          { label: 'Export as Excel', onClick: () => console.log('Excel') },
        ]}
      />
    </div>
  ),
};

// Floating Action Button
export const FloatingButtons: Story = {
  render: () => (
    <div className="relative h-64">
      <FloatingActionButton position="bottom-right">
        <Plus className="h-6 w-6" />
      </FloatingActionButton>
      <FloatingActionButton position="bottom-left" variant="secondary">
        <Settings className="h-6 w-6" />
      </FloatingActionButton>
      <FloatingActionButton position="top-right" variant="outline">
        <Search className="h-6 w-6" />
      </FloatingActionButton>
      <FloatingActionButton position="top-left" variant="destructive">
        <X className="h-6 w-6" />
      </FloatingActionButton>
    </div>
  ),
};

// Special Purpose Buttons (To Be Consolidated)
export const SpecialPurposeButtons: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h3 className="font-semibold mb-3 text-amber-800">⚠️ To Be Consolidated</h3>
        <p className="text-sm text-amber-700 mb-4">
          These special-purpose buttons can be replaced with the base Button component using appropriate props.
        </p>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-600 mb-2">Checkout Button (billing/checkout-button.tsx)</p>
            <Button variant="cta" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              Subscribe to Starter - $29/mo
            </Button>
            <p className="text-xs text-green-600 mt-1">→ Can use: Button with leftIcon and onClick handler</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-600 mb-2">Customer Portal Button (billing/customer-portal-button.tsx)</p>
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Manage Billing
            </Button>
            <p className="text-xs text-green-600 mt-1">→ Can use: Button variant="outline" with async onClick</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-600 mb-2">Google Signup Button (auth/google-signup-button.tsx)</p>
            <Button variant="outline" className="bg-white border-gray-300">
              <div className="w-4 h-4 mr-2 bg-red-500 rounded-sm" />
              Continue with Google
            </Button>
            <p className="text-xs text-green-600 mt-1">→ Can use: Button with Google icon and loading state</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-600 mb-2">Hosted Checkout Button (billing/hosted-checkout-button.tsx)</p>
            <CTAButton>
              Start Pro Trial
            </CTAButton>
            <p className="text-xs text-green-600 mt-1">→ Can use: CTAButton with async handler</p>
          </div>
          
          <div>
            <p className="text-xs text-gray-600 mb-2">Track Button (analytics/track-button.tsx)</p>
            <TrackButton trackEvent="button_click" trackProperties={{ location: 'storybook' }}>
              Track Event
            </TrackButton>
            <p className="text-xs text-green-600 mt-1">→ Can use: Button with analytics in onClick</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold mb-3 text-green-800">✅ Consolidation Benefits</h3>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• Reduce from 10+ button components to 1 flexible component</li>
          <li>• Consistent styling and behavior across the app</li>
          <li>• Easier maintenance and updates</li>
          <li>• Better TypeScript support and type safety</li>
          <li>• Reduced bundle size</li>
        </ul>
      </div>
    </div>
  ),
};

// Interactive Testing
export const InteractiveTesting: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Interactive Button Testing</h3>
      <div className="space-y-4">
        <div className="flex gap-4">
          <Button onClick={fn()} data-testid="click-test">
            Click Test
          </Button>
          <Button variant="outline" onClick={fn()} data-testid="outline-test">
            Outline Test
          </Button>
          <Button variant="destructive" onClick={fn()} data-testid="destructive-test">
            Destructive Test
          </Button>
        </div>
        <div className="flex gap-4">
          <Button disabled onClick={fn()}>Disabled</Button>
          <Button loading onClick={fn()}>Loading</Button>
          <Button leftIcon={<Plus className="h-4 w-4" />} onClick={fn()}>
            With Icon
          </Button>
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test basic button click
    const clickTest = canvas.getByTestId('click-test');
    await userEvent.click(clickTest);
    
    // Test outline button click
    const outlineTest = canvas.getByTestId('outline-test');
    await userEvent.click(outlineTest);
    
    // Test keyboard navigation
    clickTest.focus();
    await userEvent.keyboard('{Enter}');
    
    // Test space key activation
    await userEvent.keyboard('{Space}');
  },
};

// Form Integration Testing
export const FormIntegration: Story = {
  render: () => {
    const [formData, setFormData] = React.useState({ name: '', email: '' });
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsSubmitting(false);
      console.log('Form submitted:', formData);
    };
    
    return (
      <form onSubmit={handleSubmit} className="max-w-md space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md"
            data-testid="name-input"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border rounded-md"
            data-testid="email-input"
          />
        </div>
        <div className="flex gap-2">
          <Button 
            type="submit" 
            loading={isSubmitting}
            disabled={!formData.name || !formData.email}
            data-testid="submit-button"
          >
            {isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
          <Button 
            type="button" 
            variant="outline"
            onClick={() => setFormData({ name: '', email: '' })}
            data-testid="reset-button"
          >
            Reset
          </Button>
        </div>
      </form>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test form interaction
    const nameInput = canvas.getByTestId('name-input');
    const emailInput = canvas.getByTestId('email-input');
    const submitButton = canvas.getByTestId('submit-button');
    
    // Initially submit should be disabled
    expect(submitButton).toBeDisabled();
    
    // Fill form
    await userEvent.type(nameInput, 'John Doe');
    await userEvent.type(emailInput, 'john@example.com');
    
    // Submit should now be enabled
    expect(submitButton).not.toBeDisabled();
    
    // Test reset
    const resetButton = canvas.getByTestId('reset-button');
    await userEvent.click(resetButton);
    
    expect(nameInput).toHaveValue('');
    expect(emailInput).toHaveValue('');
  },
};

// Error States and Boundaries
export const ErrorStates: Story = {
  render: () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Error States & Edge Cases</h3>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">Button with very long text</p>
          <Button className="max-w-xs">
            This is a button with extremely long text that should handle overflow gracefully
          </Button>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-2">Button with special characters</p>
          <Button>
            Save & Continue → ✓
          </Button>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-2">Button with null/undefined children</p>
          <Button>{null}</Button>
          <Button className="ml-2">{undefined}</Button>
        </div>
        <div>
          <p className="text-sm text-gray-600 mb-2">Button stress test (rapid clicking)</p>
          <Button 
            onClick={fn()} 
            data-testid="stress-test"
            className="select-none"
          >
            Rapid Click Test
          </Button>
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const stressButton = canvas.getByTestId('stress-test');
    
    // Rapid clicking test
    for (let i = 0; i < 5; i++) {
      await userEvent.click(stressButton);
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  },
};

// Interactive Playground
export const Playground: Story = {
  args: {
    children: 'Playground Button',
    variant: 'default',
    size: 'default',
    fullWidth: false,
    loading: false,
    disabled: false,
    animate: false,
    onClick: fn(),
  },
  argTypes: {
    onClick: { action: 'clicked' },
  },
};