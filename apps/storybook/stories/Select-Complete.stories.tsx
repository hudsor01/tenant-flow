import type { Meta, StoryObj } from '@storybook/react';
import { Building, Users, MapPin, DollarSign, Calendar, Home } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '../../../apps/frontend/src/components/ui/select';

const meta: Meta<typeof Select> = {
  title: 'UI/Select System',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic Select Variants
export const BasicSelects: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <h3 className="text-lg font-semibold">Basic Select Components</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Default Select</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Small Size Select</label>
          <Select>
            <SelectTrigger size="sm">
              <SelectValue placeholder="Select size small" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small1">Small Option 1</SelectItem>
              <SelectItem value="small2">Small Option 2</SelectItem>
              <SelectItem value="small3">Small Option 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">With Default Value</label>
          <Select defaultValue="default2">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default1">Default Option 1</SelectItem>
              <SelectItem value="default2">Default Option 2 (Selected)</SelectItem>
              <SelectItem value="default3">Default Option 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  ),
};

// Property Type Selector
export const PropertyTypeSelector: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <div className="text-center">
        <Building className="mx-auto h-8 w-8 text-primary mb-2" />
        <h3 className="text-lg font-semibold">Property Type Selection</h3>
        <p className="text-sm text-muted-foreground">Choose the type of property you're managing</p>
      </div>
      
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select property type" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Residential</SelectLabel>
            <SelectItem value="apartment">🏢 Apartment</SelectItem>
            <SelectItem value="house">🏠 Single Family House</SelectItem>
            <SelectItem value="condo">🏘️ Condominium</SelectItem>
            <SelectItem value="townhouse">🏘️ Townhouse</SelectItem>
            <SelectItem value="duplex">🏠 Duplex</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Commercial</SelectLabel>
            <SelectItem value="office">🏢 Office Space</SelectItem>
            <SelectItem value="retail">🏪 Retail Space</SelectItem>
            <SelectItem value="warehouse">🏭 Warehouse</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
};

// Tenant Status Selector
export const TenantStatusSelector: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <div className="text-center">
        <Users className="mx-auto h-8 w-8 text-primary mb-2" />
        <h3 className="text-lg font-semibold">Tenant Status</h3>
        <p className="text-sm text-muted-foreground">Filter tenants by their current status</p>
      </div>
      
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select tenant status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="active">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Active Tenant
            </span>
          </SelectItem>
          <SelectItem value="pending">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              Application Pending
            </span>
          </SelectItem>
          <SelectItem value="late">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              Late Payment
            </span>
          </SelectItem>
          <SelectItem value="inactive">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              Inactive
            </span>
          </SelectItem>
          <SelectItem value="former">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400"></span>
              Former Tenant
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

// Location/City Selector
export const LocationSelector: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <div className="text-center">
        <MapPin className="mx-auto h-8 w-8 text-primary mb-2" />
        <h3 className="text-lg font-semibold">Property Locations</h3>
        <p className="text-sm text-muted-foreground">Select properties by city or neighborhood</p>
      </div>
      
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select location" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>New York</SelectLabel>
            <SelectItem value="manhattan">Manhattan</SelectItem>
            <SelectItem value="brooklyn">Brooklyn</SelectItem>
            <SelectItem value="queens">Queens</SelectItem>
            <SelectItem value="bronx">The Bronx</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>California</SelectLabel>
            <SelectItem value="sf">San Francisco</SelectItem>
            <SelectItem value="la">Los Angeles</SelectItem>
            <SelectItem value="san-diego">San Diego</SelectItem>
            <SelectItem value="oakland">Oakland</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Texas</SelectLabel>
            <SelectItem value="austin">Austin</SelectItem>
            <SelectItem value="dallas">Dallas</SelectItem>
            <SelectItem value="houston">Houston</SelectItem>
            <SelectItem value="san-antonio">San Antonio</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
};

// Price Range Selector
export const PriceRangeSelector: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <div className="text-center">
        <DollarSign className="mx-auto h-8 w-8 text-primary mb-2" />
        <h3 className="text-lg font-semibold">Rent Price Range</h3>
        <p className="text-sm text-muted-foreground">Filter properties by monthly rent</p>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Min Rent</label>
          <Select>
            <SelectTrigger size="sm">
              <SelectValue placeholder="Min $" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="500">$500</SelectItem>
              <SelectItem value="750">$750</SelectItem>
              <SelectItem value="1000">$1,000</SelectItem>
              <SelectItem value="1250">$1,250</SelectItem>
              <SelectItem value="1500">$1,500</SelectItem>
              <SelectItem value="2000">$2,000</SelectItem>
              <SelectItem value="2500">$2,500</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <label className="text-sm font-medium mb-1 block">Max Rent</label>
          <Select>
            <SelectTrigger size="sm">
              <SelectValue placeholder="Max $" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1000">$1,000</SelectItem>
              <SelectItem value="1500">$1,500</SelectItem>
              <SelectItem value="2000">$2,000</SelectItem>
              <SelectItem value="2500">$2,500</SelectItem>
              <SelectItem value="3000">$3,000</SelectItem>
              <SelectItem value="4000">$4,000</SelectItem>
              <SelectItem value="5000">$5,000+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  ),
};

// Time Period Selector
export const TimePeriodSelector: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <div className="text-center">
        <Calendar className="mx-auto h-8 w-8 text-primary mb-2" />
        <h3 className="text-lg font-semibold">Report Time Period</h3>
        <p className="text-sm text-muted-foreground">Select time range for analytics and reports</p>
      </div>
      
      <Select defaultValue="this-month">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Quick Periods</SelectLabel>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="yesterday">Yesterday</SelectItem>
            <SelectItem value="this-week">This Week</SelectItem>
            <SelectItem value="last-week">Last Week</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Monthly</SelectLabel>
            <SelectItem value="this-month">This Month</SelectItem>
            <SelectItem value="last-month">Last Month</SelectItem>
            <SelectItem value="last-3-months">Last 3 Months</SelectItem>
            <SelectItem value="last-6-months">Last 6 Months</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Yearly</SelectLabel>
            <SelectItem value="this-year">This Year</SelectItem>
            <SelectItem value="last-year">Last Year</SelectItem>
            <SelectItem value="all-time">All Time</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
};

// Property Amenities Selector
export const PropertyAmenitiesSelector: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <div className="text-center">
        <Home className="mx-auto h-8 w-8 text-primary mb-2" />
        <h3 className="text-lg font-semibold">Property Amenities</h3>
        <p className="text-sm text-muted-foreground">Select amenities to filter properties</p>
      </div>
      
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Select amenities" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Interior Features</SelectLabel>
            <SelectItem value="air-conditioning">❄️ Air Conditioning</SelectItem>
            <SelectItem value="heating">🔥 Central Heating</SelectItem>
            <SelectItem value="dishwasher">🍽️ Dishwasher</SelectItem>
            <SelectItem value="washer-dryer">👕 Washer/Dryer</SelectItem>
            <SelectItem value="fireplace">🔥 Fireplace</SelectItem>
            <SelectItem value="hardwood-floors">🌳 Hardwood Floors</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Building Amenities</SelectLabel>
            <SelectItem value="elevator">🛗 Elevator</SelectItem>
            <SelectItem value="doorman">👨‍💼 Doorman</SelectItem>
            <SelectItem value="gym">💪 Fitness Center</SelectItem>
            <SelectItem value="pool">🏊‍♀️ Swimming Pool</SelectItem>
            <SelectItem value="parking">🚗 Parking</SelectItem>
            <SelectItem value="storage">📦 Storage Unit</SelectItem>
          </SelectGroup>
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>Pet-Friendly</SelectLabel>
            <SelectItem value="cats-allowed">🐱 Cats Allowed</SelectItem>
            <SelectItem value="dogs-allowed">🐕 Dogs Allowed</SelectItem>
            <SelectItem value="pet-deposit">💰 Pet Deposit Required</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  ),
};

// Multiple Selects in Form
export const MultipleSelectsForm: Story = {
  render: () => (
    <div className="space-y-6 w-96">
      <h3 className="text-lg font-semibold text-center">Property Search Filters</h3>
      <p className="text-sm text-muted-foreground text-center">
        Use multiple selects to narrow down your property search
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Property Type</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Any type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Type</SelectItem>
              <SelectItem value="apartment">Apartment</SelectItem>
              <SelectItem value="house">House</SelectItem>
              <SelectItem value="condo">Condo</SelectItem>
              <SelectItem value="townhouse">Townhouse</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Bedrooms</label>
            <Select>
              <SelectTrigger size="sm">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="0">Studio</SelectItem>
                <SelectItem value="1">1 BR</SelectItem>
                <SelectItem value="2">2 BR</SelectItem>
                <SelectItem value="3">3 BR</SelectItem>
                <SelectItem value="4">4+ BR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Bathrooms</label>
            <Select>
              <SelectTrigger size="sm">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="1">1 Bath</SelectItem>
                <SelectItem value="1.5">1.5 Bath</SelectItem>
                <SelectItem value="2">2 Bath</SelectItem>
                <SelectItem value="2.5">2.5 Bath</SelectItem>
                <SelectItem value="3">3+ Bath</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-2 block">Min Rent</label>
            <Select>
              <SelectTrigger size="sm">
                <SelectValue placeholder="$0" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">$0</SelectItem>
                <SelectItem value="500">$500</SelectItem>
                <SelectItem value="1000">$1,000</SelectItem>
                <SelectItem value="1500">$1,500</SelectItem>
                <SelectItem value="2000">$2,000</SelectItem>
                <SelectItem value="2500">$2,500</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Max Rent</label>
            <Select>
              <SelectTrigger size="sm">
                <SelectValue placeholder="No max" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unlimited">No Max</SelectItem>
                <SelectItem value="1500">$1,500</SelectItem>
                <SelectItem value="2000">$2,000</SelectItem>
                <SelectItem value="2500">$2,500</SelectItem>
                <SelectItem value="3000">$3,000</SelectItem>
                <SelectItem value="4000">$4,000</SelectItem>
                <SelectItem value="5000">$5,000+</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Location</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select neighborhood" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Manhattan</SelectLabel>
                <SelectItem value="upper-east">Upper East Side</SelectItem>
                <SelectItem value="upper-west">Upper West Side</SelectItem>
                <SelectItem value="midtown">Midtown</SelectItem>
                <SelectItem value="soho">SoHo</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                <SelectLabel>Brooklyn</SelectLabel>
                <SelectItem value="williamsburg">Williamsburg</SelectItem>
                <SelectItem value="park-slope">Park Slope</SelectItem>
                <SelectItem value="dumbo">DUMBO</SelectItem>
                <SelectItem value="carroll-gardens">Carroll Gardens</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Pet Policy</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Any pet policy" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any Policy</SelectItem>
              <SelectItem value="no-pets">No Pets</SelectItem>
              <SelectItem value="cats-only">Cats Only</SelectItem>
              <SelectItem value="dogs-only">Dogs Only</SelectItem>
              <SelectItem value="cats-dogs">Cats & Dogs</SelectItem>
              <SelectItem value="all-pets">All Pets Welcome</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  ),
};

// Disabled and Loading States
export const SelectStates: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <h3 className="text-lg font-semibold">Select States</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Normal Select</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
              <SelectItem value="option3">Option 3</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block opacity-50">Disabled Select</label>
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="This select is disabled" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">With Error State</label>
          <Select>
            <SelectTrigger className="border-destructive ring-destructive/20 focus:border-destructive focus:ring-destructive/20">
              <SelectValue placeholder="This field has an error" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="option1">Option 1</SelectItem>
              <SelectItem value="option2">Option 2</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-sm text-destructive">Please select a valid option.</p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Loading Options</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Loading..." />
            </SelectTrigger>
            <SelectContent>
              <div className="p-3 text-center text-sm text-muted-foreground">
                Loading options...
              </div>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  ),
};

// Accessibility Demonstration
export const AccessibilityDemo: Story = {
  render: () => (
    <div className="space-y-6 w-80">
      <h3 className="text-lg font-semibold">Accessibility Features</h3>
      <p className="text-sm text-muted-foreground">
        All selects include proper ARIA labels, keyboard navigation, and screen reader support.
      </p>
      
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Property Status *
            <span className="text-muted-foreground font-normal"> (Required)</span>
          </label>
          <Select required>
            <SelectTrigger aria-label="Property Status Selection" aria-required="true">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="occupied">Occupied</SelectItem>
              <SelectItem value="maintenance">Under Maintenance</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
            </SelectContent>
          </Select>
          <p className="mt-1 text-xs text-muted-foreground">
            Use arrow keys to navigate, Enter to select, Escape to close
          </p>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">
            Priority Level
            <span className="text-muted-foreground font-normal"> (Optional)</span>
          </label>
          <Select>
            <SelectTrigger aria-describedby="priority-help">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low" aria-describedby="low-help">
                Low Priority
              </SelectItem>
              <SelectItem value="medium" aria-describedby="medium-help">
                Medium Priority  
              </SelectItem>
              <SelectItem value="high" aria-describedby="high-help">
                High Priority
              </SelectItem>
              <SelectItem value="urgent" aria-describedby="urgent-help">
                Urgent
              </SelectItem>
            </SelectContent>
          </Select>
          <p id="priority-help" className="mt-1 text-xs text-muted-foreground">
            Select the priority level for this maintenance request
          </p>
        </div>
      </div>
    </div>
  ),
};

// Interactive Playground
export const Playground: Story = {
  args: {
    disabled: false,
  },
  render: (args) => (
    <div className="w-80">
      <label className="text-sm font-medium mb-2 block">Interactive Playground</label>
      <Select {...args}>
        <SelectTrigger>
          <SelectValue placeholder="Select from playground" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="playground1">Playground Option 1</SelectItem>
          <SelectItem value="playground2">Playground Option 2</SelectItem>
          <SelectItem value="playground3">Playground Option 3</SelectItem>
          <SelectItem value="playground4">Playground Option 4</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};