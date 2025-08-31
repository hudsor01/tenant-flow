import type { Meta, StoryObj } from '@storybook/react';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter,
  CardAction 
} from '../../../apps/frontend/src/components/ui/card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the card',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description goes here</CardDescription>
      </CardHeader>
      <CardContent>
        <p>This is the main content area of the card.</p>
      </CardContent>
    </Card>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Property Details</CardTitle>
        <CardDescription>123 Main Street, Anytown, USA</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p><strong>Rent:</strong> $1,200/month</p>
          <p><strong>Bedrooms:</strong> 2</p>
          <p><strong>Bathrooms:</strong> 1</p>
        </div>
      </CardContent>
      <CardFooter>
        <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
          View Details
        </button>
      </CardFooter>
    </Card>
  ),
};

export const WithAction: Story = {
  render: () => (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>Maintenance Request</CardTitle>
        <CardAction>
          <button className="text-gray-500 hover:text-gray-700">
            <span className="sr-only">More options</span>
            ⋯
          </button>
        </CardAction>
        <CardDescription>Leaky faucet in bathroom</CardDescription>
      </CardHeader>
      <CardContent>
        <p>The bathroom faucet has been dripping for the past week. It's getting worse and needs immediate attention.</p>
        <div className="mt-4 text-sm text-gray-500">
          <p>Status: <span className="text-orange-600">In Progress</span></p>
          <p>Priority: High</p>
        </div>
      </CardContent>
    </Card>
  ),
};

export const TenantDashboard: Story = {
  render: () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Rent Payment</CardTitle>
          <CardDescription>Due January 1, 2024</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">$1,200.00</div>
        </CardContent>
        <CardFooter>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 w-full">
            Pay Now
          </button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Maintenance</CardTitle>
          <CardDescription>Current requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">3</div>
          <p className="text-sm text-gray-600">2 In Progress, 1 Scheduled</p>
        </CardContent>
        <CardFooter>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full">
            View All
          </button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lease Status</CardTitle>
          <CardDescription>Current lease information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <p className="font-semibold">Active</p>
            <p className="text-sm text-gray-600">Expires: Dec 31, 2024</p>
          </div>
        </CardContent>
        <CardFooter>
          <button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 w-full">
            Download Lease
          </button>
        </CardFooter>
      </Card>
    </div>
  ),
};

export const Interactive: Story = {
  args: {
    className: "w-[400px]",
  },
  render: (args) => (
    <Card {...args}>
      <CardHeader>
        <CardTitle>Interactive Card</CardTitle>
        <CardDescription>
          This card demonstrates how you can customize the styling using the className prop
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p>Try changing the className in the controls panel to see how it affects the card styling.</p>
        <p className="mt-2 text-sm text-gray-500">
          You can add classes like "border-2 border-blue-500" or "shadow-lg" to see different effects.
        </p>
      </CardContent>
    </Card>
  ),
};