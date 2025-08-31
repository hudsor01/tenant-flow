import type { Meta, StoryObj } from '@storybook/react';
import { TenantFlowDataTable } from '@repo/frontend/src/components/tailadmin';
import { Button } from '@repo/frontend/src/components/ui/button';
import { Badge } from '@repo/frontend/src/components/ui/badge';

const meta: Meta<typeof TenantFlowDataTable> = {
  title: 'TailAdmin/Data/TenantFlowDataTable',
  component: TenantFlowDataTable,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Professional data table component with built-in styling for user information, status badges, and actions. Perfect for displaying tenant, property, and maintenance data.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    data: {
      description: 'Array of data objects to display in the table',
    },
    columns: {
      description: 'Column definitions with keys, titles, and optional render functions',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample tenant data
const sampleTenants = [
  {
    id: 1,
    user: {
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      name: "John Doe",
      email: "john.doe@example.com",
    },
    property: "Sunset Apartments",
    unit: "Unit 101",
    status: "active" as const,
    amount: "$1,200",
    date: "2024-01-15",
    priority: "medium" as const,
  },
  {
    id: 2,
    user: {
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
      name: "Jane Smith",
      email: "jane.smith@example.com",
    },
    property: "Downtown Lofts",
    unit: "Unit 205",
    status: "pending" as const,
    amount: "$1,500",
    date: "2024-01-14",
    priority: "high" as const,
  },
  {
    id: 3,
    user: {
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
      name: "Mike Johnson",
      email: "mike.johnson@example.com",
    },
    property: "Riverside Commons",
    unit: "Unit 301",
    status: "expired" as const,
    amount: "$950",
    date: "2024-01-10",
    priority: "low" as const,
  },
  {
    id: 4,
    user: {
      image: "https://images.unsplash.com/photo-1494790108755-2616b5c2a8c3?w=40&h=40&fit=crop&crop=face",
      name: "Sarah Wilson",
      email: "sarah.wilson@example.com",
    },
    property: "Garden View Apartments",
    unit: "Unit 102",
    status: "cancelled" as const,
    amount: "$1,100",
    date: "2024-01-12",
    priority: "medium" as const,
  },
];

// Basic table with standard columns
export const Basic: Story = {
  args: {
    data: sampleTenants,
    columns: [
      { key: 'user', title: 'Tenant' },
      { key: 'property', title: 'Property' },
      { key: 'unit', title: 'Unit' },
      { key: 'status', title: 'Status' },
      { key: 'amount', title: 'Rent' },
      { key: 'date', title: 'Date' },
    ],
  },
};

// Table with priority column
export const WithPriority: Story = {
  args: {
    data: sampleTenants,
    columns: [
      { key: 'user', title: 'Tenant' },
      { key: 'property', title: 'Property' },
      { key: 'unit', title: 'Unit' },
      { key: 'status', title: 'Status' },
      { key: 'priority', title: 'Priority' },
      { key: 'amount', title: 'Rent' },
    ],
  },
};

// Table with custom actions column
export const WithActions: Story = {
  args: {
    data: sampleTenants,
    columns: [
      { key: 'user', title: 'Tenant' },
      { key: 'property', title: 'Property' },
      { key: 'unit', title: 'Unit' },
      { key: 'status', title: 'Status' },
      { key: 'amount', title: 'Rent' },
      {
        key: 'actions',
        title: 'Actions',
        render: (_, row) => (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline">
              Edit
            </Button>
            <Button size="sm" variant="destructive">
              Delete
            </Button>
          </div>
        ),
      },
    ],
  },
};

// Maintenance requests table variant
const maintenanceData = [
  {
    id: 1,
    user: {
      image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face",
      name: "John Doe",
      email: "john.doe@example.com",
    },
    property: "Plumbing Issue",
    unit: "Unit 101",
    status: "pending" as const,
    priority: "high" as const,
    date: "2024-01-15",
  },
  {
    id: 2,
    user: {
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face",
      name: "Jane Smith",
      email: "jane.smith@example.com",
    },
    property: "AC Repair",
    unit: "Unit 205",
    status: "active" as const,
    priority: "medium" as const,
    date: "2024-01-14",
  },
  {
    id: 3,
    user: {
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face",
      name: "Mike Johnson",
      email: "mike.johnson@example.com",
    },
    property: "Light Fixture",
    unit: "Unit 301",
    status: "cancelled" as const,
    priority: "low" as const,
    date: "2024-01-10",
  },
];

export const MaintenanceRequests: Story = {
  args: {
    data: maintenanceData,
    columns: [
      { key: 'user', title: 'Tenant' },
      { key: 'property', title: 'Issue' },
      { key: 'unit', title: 'Unit' },
      { key: 'priority', title: 'Priority' },
      { key: 'status', title: 'Status' },
      { key: 'date', title: 'Reported' },
      {
        key: 'actions',
        title: 'Actions',
        render: (_, row) => (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline">
              View
            </Button>
            <Button size="sm">
              Assign
            </Button>
          </div>
        ),
      },
    ],
  },
};

// Custom rendering example
export const CustomRendering: Story = {
  args: {
    data: sampleTenants,
    columns: [
      { key: 'user', title: 'Tenant' },
      { 
        key: 'property', 
        title: 'Property & Unit',
        render: (_, row) => (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {row.property}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {row.unit}
            </div>
          </div>
        ),
      },
      { key: 'status', title: 'Status' },
      {
        key: 'amount',
        title: 'Monthly Rent',
        render: (value, row) => (
          <div>
            <div className="font-semibold text-green-600 dark:text-green-400">
              {value}
            </div>
            <div className="text-xs text-gray-500">
              Due: {row.date}
            </div>
          </div>
        ),
      },
      {
        key: 'actions',
        title: 'Quick Actions',
        render: (_, row) => (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost">
              Contact
            </Button>
            <Button size="sm" variant="outline">
              Invoice
            </Button>
          </div>
        ),
      },
    ],
  },
};

// Empty state
export const Empty: Story = {
  args: {
    data: [],
    columns: [
      { key: 'user', title: 'Tenant' },
      { key: 'property', title: 'Property' },
      { key: 'unit', title: 'Unit' },
      { key: 'status', title: 'Status' },
      { key: 'amount', title: 'Rent' },
    ],
  },
  render: (args) => (
    <div>
      <TenantFlowDataTable {...args} />
      <div className="mt-8 text-center text-gray-500">
        <p>This shows how the table handles empty data gracefully.</p>
      </div>
    </div>
  ),
};