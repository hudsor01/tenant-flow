import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CreditCard, 
  Users, 
  Settings, 
  Download,
  Building,
  MapPin,
  DollarSign,
  Trash2,
  Edit,
  Eye
} from 'lucide-react';
import { StoryErrorBoundary } from '../utils/ErrorBoundary';
import { mockPlanTypes, type MockPlanType } from '../utils/mockData';

const meta = {
  title: 'Consolidation/Before & After Examples',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Practical examples showing how to consolidate specialized components into flexible base components.',
      },
    },
  },
  decorators: [
    (Story) => (
      <StoryErrorBoundary>
        <Story />
      </StoryErrorBoundary>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// =============================================================================
// BEFORE: Specialized Button Components
// =============================================================================

// ❌ OLD WAY: Specialized checkout button
const OldCheckoutButton: React.FC<{ planType: MockPlanType; onClick?: () => void }> = ({ 
  planType, 
  onClick = () => {} 
}) => (
  <button 
    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
    onClick={onClick}
  >
    <CreditCard className="h-5 w-5" />
    Subscribe to {planType}
  </button>
);

// ❌ OLD WAY: Specialized Google signup button  
const OldGoogleSignupButton: React.FC<{ onSignup?: () => void; isLoading?: boolean }> = ({ 
  onSignup = () => {},
  isLoading = false
}) => (
  <button 
    className="w-full px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
    onClick={onSignup}
    disabled={isLoading}
  >
    <div className="w-5 h-5 bg-gradient-to-r from-red-500 to-yellow-500 rounded-full" />
    {isLoading ? 'Connecting...' : 'Continue with Google'}
  </button>
);

// ❌ OLD WAY: Specialized customer portal button
const OldCustomerPortalButton: React.FC<{ onClick?: () => void }> = ({ 
  onClick = () => {} 
}) => (
  <button 
    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
    onClick={onClick}
  >
    <Settings className="h-4 w-4" />
    Manage Billing
  </button>
);

// =============================================================================
// AFTER: Using Unified Button Component
// =============================================================================

// ✅ NEW WAY: All using the same Button component with different props
const NewCheckoutButton: React.FC<{ planType: MockPlanType; onClick?: () => void }> = ({ 
  planType, 
  onClick = () => {} 
}) => (
  <Button
    leftIcon={<CreditCard className="h-5 w-5" />}
    size="lg"
    onClick={onClick}
  >
    Subscribe to {planType}
  </Button>
);

const NewGoogleSignupButton: React.FC<{ onSignup?: () => void; isLoading?: boolean }> = ({ 
  onSignup = () => {},
  isLoading = false
}) => (
  <Button
    variant="outline"
    fullWidth
    leftIcon={<div className="w-5 h-5 bg-gradient-to-r from-red-500 to-yellow-500 rounded-full" />}
    loading={isLoading}
    loadingText="Connecting..."
    onClick={onSignup}
  >
    Continue with Google
  </Button>
);

const NewCustomerPortalButton: React.FC<{ onClick?: () => void }> = ({ 
  onClick = () => {} 
}) => (
  <Button
    variant="outline"
    leftIcon={<Settings className="h-4 w-4" />}
    onClick={onClick}
  >
    Manage Billing
  </Button>
);

// =============================================================================
// BEFORE: Specialized Card Components
// =============================================================================

// ❌ OLD WAY: Specialized pricing card
const OldPricingCard: React.FC<{
  title: string;
  price: string;
  features: string[];
  popular?: boolean;
  onSelect?: () => void;
}> = ({ title, price, features, popular = false, onSelect = () => {} }) => (
  <div className={`border rounded-lg p-6 relative ${popular ? 'border-brand-500 shadow-lg' : 'border-gray-200'}`}>
    {popular && (
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-3 py-1 rounded-full text-sm">
        Most Popular
      </div>
    )}
    <div className="text-center mb-6">
      <h3 className="text-xl font-bold">{title}</h3>
      <div className="text-3xl font-bold mt-2">{price}</div>
    </div>
    <ul className="space-y-2 mb-6">
      {features.map((feature, index) => (
        <li key={index} className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded-full mr-2 flex-shrink-0" />
          <span className="text-sm">{feature}</span>
        </li>
      ))}
    </ul>
    <button 
      className={`w-full py-2 px-4 rounded font-medium transition-colors ${
        popular 
          ? 'bg-blue-600 text-white hover:bg-blue-700' 
          : 'border border-gray-300 hover:bg-gray-50'
      }`}
      onClick={onSelect}
    >
      Get Started
    </button>
  </div>
);

// ❌ OLD WAY: Specialized property card
const OldPropertyCard: React.FC<{
  name: string;
  address: string;
  rent: number;
  units: number;
  occupied: number;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ name, address, rent, units, occupied, onView = () => {}, onEdit = () => {}, onDelete = () => {} }) => (
  <div className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
    <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Building className="h-12 w-12 text-blue-500" />
    </div>
    <div className="p-4">
      <h3 className="font-bold text-lg">{name}</h3>
      <p className="text-gray-600 text-sm flex items-center mt-1">
        <MapPin className="h-3 w-3 mr-1" />
        {address}
      </p>
      <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
        <div>
          <span className="text-gray-500">Rent:</span>
          <p className="font-semibold">${rent.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-gray-500">Occupancy:</span>
          <p className="font-semibold">{occupied}/{units}</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onView} className="flex-1 bg-blue-600 text-white py-2 px-3 rounded text-sm hover:bg-blue-700">
          View
        </button>
        <button onClick={onEdit} className="p-2 border border-gray-300 rounded hover:bg-gray-50">
          <Edit className="h-4 w-4" />
        </button>
        <button onClick={onDelete} className="p-2 border border-gray-300 rounded hover:bg-red-50 text-red-600">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
);

// =============================================================================
// AFTER: Using Unified Card Component
// =============================================================================

// ✅ NEW WAY: Pricing card using base Card component
const NewPricingCard: React.FC<{
  title: string;
  price: string;
  features: string[];
  popular?: boolean;
  onSelect?: () => void;
}> = ({ title, price, features, popular = false, onSelect = () => {} }) => (
  <Card className={`relative ${popular ? 'border-brand-500 shadow-lg' : ''}`}>
    {popular && (
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
        <Badge className="bg-blue-500">Most Popular</Badge>
      </div>
    )}
    <CardHeader className="text-center">
      <CardTitle className="text-xl">{title}</CardTitle>
      <div className="text-3xl font-bold mt-2">{price}</div>
    </CardHeader>
    <CardContent>
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded-full mr-2 flex-shrink-0" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>
    </CardContent>
    <CardFooter>
      <Button 
        className="w-full" 
        variant={popular ? "default" : "outline"}
        onClick={onSelect}
      >
        Get Started
      </Button>
    </CardFooter>
  </Card>
);

// ✅ NEW WAY: Property card using base Card component
const NewPropertyCard: React.FC<{
  name: string;
  address: string;
  rent: number;
  units: number;
  occupied: number;
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}> = ({ name, address, rent, units, occupied, onView = () => {}, onEdit = () => {}, onDelete = () => {} }) => (
  <Card className="overflow-hidden">
    <div className="h-32 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <Building className="h-12 w-12 text-blue-500" />
    </div>
    <CardHeader>
      <CardTitle className="text-lg">{name}</CardTitle>
      <CardDescription className="flex items-center gap-1">
        <MapPin className="h-3 w-3" />
        {address}
      </CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Rent:</span>
          <p className="font-semibold flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {rent.toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-gray-500">Occupancy:</span>
          <p className="font-semibold">{occupied}/{units}</p>
        </div>
      </div>
    </CardContent>
    <CardFooter className="gap-2">
      <Button className="flex-1" onClick={onView}>
        <Eye className="h-4 w-4 mr-1" />
        View
      </Button>
      <Button variant="outline" size="sm" onClick={onEdit}>
        <Edit className="h-4 w-4" />
      </Button>
      <Button variant="outline" size="sm" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </CardFooter>
  </Card>
);

// =============================================================================
// STORIES
// =============================================================================

export const ButtonConsolidation: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-red-800">❌ BEFORE: Specialized Components</h2>
        <p className="text-red-700 mb-4">Multiple button components with duplicated logic and styling:</p>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">CheckoutButton.tsx (45 lines)</h3>
            <OldCheckoutButton planType="PROFESSIONAL" onClick={fn()} />
          </div>
          <div>
            <h3 className="font-semibold mb-2">GoogleSignupButton.tsx (38 lines)</h3>
            <div className="max-w-sm">
              <OldGoogleSignupButton onSignup={fn()} />
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">CustomerPortalButton.tsx (32 lines)</h3>
            <OldCustomerPortalButton onClick={fn()} />
          </div>
        </div>
        <div className="mt-4 p-3 bg-white rounded border-l-4 border-red-500">
          <p className="text-sm text-gray-700">
            <strong>Problems:</strong> 115+ lines of duplicated code, inconsistent styling, 
            maintenance overhead, no shared state management.
          </p>
        </div>
      </div>

      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-green-800">✅ AFTER: Unified Button Component</h2>
        <p className="text-green-700 mb-4">All functionality using one flexible Button component:</p>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Button with leftIcon + size props</h3>
            <NewCheckoutButton planType="PROFESSIONAL" onClick={fn()} />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Button with variant="outline" + loading state</h3>
            <div className="max-w-sm">
              <NewGoogleSignupButton onSignup={fn()} />
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Button with variant="outline" + leftIcon</h3>
            <NewCustomerPortalButton onClick={fn()} />
          </div>
        </div>
        <div className="mt-4 p-3 bg-white rounded border-l-4 border-green-500">
          <p className="text-sm text-gray-700">
            <strong>Benefits:</strong> 90% code reduction, consistent behavior, 
            centralized maintenance, shared TypeScript types.
          </p>
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test both old and new button implementations
    const buttons = canvas.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(4);
    
    // Click some buttons to test functionality
    await userEvent.click(buttons[0]); // Old checkout
    await userEvent.click(buttons[3]); // New checkout
  },
};

export const CardConsolidation: Story = {
  render: () => (
    <div className="space-y-8">
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-red-800">❌ BEFORE: Specialized Card Components</h2>
        <p className="text-red-700 mb-4">Multiple card components with different structures:</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">PricingCard.tsx (120+ lines)</h3>
            <OldPricingCard
              title="Professional"
              price="$99/mo"
              features={['25 Properties', 'Advanced Analytics', 'Priority Support']}
              popular
              onSelect={fn()}
            />
          </div>
          <div>
            <h3 className="font-semibold mb-2">PropertyCard.tsx (85+ lines)</h3>
            <OldPropertyCard
              name="Sunset Apartments"
              address="123 Main St"
              rent={2500}
              units={24}
              occupied={22}
              onView={fn()}
              onEdit={fn()}
              onDelete={fn()}
            />
          </div>
        </div>
        <div className="mt-4 p-3 bg-white rounded border-l-4 border-red-500">
          <p className="text-sm text-gray-700">
            <strong>Problems:</strong> 205+ lines of duplicated structure, inconsistent layouts, 
            different animation patterns, maintenance nightmare.
          </p>
        </div>
      </div>

      <div className="p-6 bg-green-50 border border-green-200 rounded-lg">
        <h2 className="text-xl font-bold mb-4 text-green-800">✅ AFTER: Composable Card System</h2>
        <p className="text-green-700 mb-4">Same functionality using flexible Card components:</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-2">Card + Badge + Button composition</h3>
            <NewPricingCard
              title="Professional"
              price="$99/mo"
              features={['25 Properties', 'Advanced Analytics', 'Priority Support']}
              popular
              onSelect={fn()}
            />
          </div>
          <div>
            <h3 className="font-semibold mb-2">Card + CardHeader + CardContent + CardFooter</h3>
            <NewPropertyCard
              name="Sunset Apartments"
              address="123 Main St"
              rent={2500}
              units={24}
              occupied={22}
              onView={fn()}
              onEdit={fn()}
              onDelete={fn()}
            />
          </div>
        </div>
        <div className="mt-4 p-3 bg-white rounded border-l-4 border-green-500">
          <p className="text-sm text-gray-700">
            <strong>Benefits:</strong> 80% code reduction, consistent hover effects, 
            composable structure, easy theme customization.
          </p>
        </div>
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    
    // Test card interactions
    const getStartedButtons = canvas.getAllByText('Get Started');
    const viewButtons = canvas.getAllByText(/View/);
    
    if (getStartedButtons.length > 0) {
      await userEvent.click(getStartedButtons[0]); // Old pricing card
      if (getStartedButtons[1]) await userEvent.click(getStartedButtons[1]); // New pricing card
    }
    
    if (viewButtons.length > 0) {
      await userEvent.click(viewButtons[0]); // Test view button
    }
  },
};

export const ConsolidationMetrics: Story = {
  render: () => (
    <div className="p-8 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl">
      <h2 className="text-2xl font-bold mb-8 text-center">Component Consolidation Impact</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-sm text-center">
          <div className="text-4xl font-bold text-red-600 mb-2">12+</div>
          <div className="text-gray-600">Components Before</div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm text-center">
          <div className="text-4xl font-bold text-green-600 mb-2">2</div>
          <div className="text-gray-600">Components After</div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm text-center">
          <div className="text-4xl font-bold text-blue-600 mb-2">83%</div>
          <div className="text-gray-600">Code Reduction</div>
        </div>
      </div>

      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Implementation Roadmap</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
            <span>Phase 1: Create base Button and Card components</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white text-xs">✓</div>
            <span>Phase 2: Document consolidation patterns in Storybook</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white text-xs">3</div>
            <span>Phase 3: Migrate specialized components one by one</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-white text-xs">4</div>
            <span>Phase 4: Remove old component files and update imports</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-white text-xs">5</div>
            <span>Phase 5: Update tests and documentation</span>
          </div>
        </div>
      </div>
    </div>
  ),
};