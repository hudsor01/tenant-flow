import type { Meta, StoryObj } from '@storybook/react';
import { DashboardSidebar } from '@repo/frontend/src/components/tailadmin';
import { useState } from 'react';

const meta: Meta<typeof DashboardSidebar> = {
  title: 'TailAdmin/Layout/DashboardSidebar',
  component: DashboardSidebar,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Professional dashboard sidebar component adapted from TailAdmin V2. Features collapsible navigation with tenant management specific menu items.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    isExpanded: {
      control: 'boolean',
      description: 'Controls whether the sidebar is expanded or collapsed',
    },
    onToggle: {
      description: 'Callback fired when the sidebar toggle button is clicked',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Default expanded state
export const Expanded: Story = {
  args: {
    isExpanded: true,
  },
  render: (args) => {
    const [expanded, setExpanded] = useState(args.isExpanded);
    
    return (
      <div className="flex h-screen bg-gray-50">
        <DashboardSidebar
          {...args}
          isExpanded={expanded}
          onToggle={() => setExpanded(!expanded)}
        />
        <div className="flex-1 p-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Main Content Area</h2>
            <p className="mt-2 text-gray-600">
              This is how the sidebar looks when integrated with the main content area.
              Try toggling the sidebar using the hamburger menu.
            </p>
          </div>
        </div>
      </div>
    );
  },
};

// Collapsed state
export const Collapsed: Story = {
  args: {
    isExpanded: false,
  },
  render: (args) => {
    const [expanded, setExpanded] = useState(args.isExpanded);
    
    return (
      <div className="flex h-screen bg-gray-50">
        <DashboardSidebar
          {...args}
          isExpanded={expanded}
          onToggle={() => setExpanded(!expanded)}
        />
        <div className="flex-1 p-6">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-semibold text-gray-900">Collapsed Sidebar</h2>
            <p className="mt-2 text-gray-600">
              When collapsed, the sidebar shows only icons. Hover over items to see tooltips.
            </p>
          </div>
        </div>
      </div>
    );
  },
};

// Interactive example
export const Interactive: Story = {
  args: {
    isExpanded: true,
  },
  render: (args) => {
    const [expanded, setExpanded] = useState(args.isExpanded);
    
    return (
      <div className="flex h-screen bg-gray-50">
        <DashboardSidebar
          {...args}
          isExpanded={expanded}
          onToggle={() => setExpanded(!expanded)}
        />
        <div className="flex-1 p-6">
          <div className="space-y-4">
            <div className="rounded-lg bg-white p-6 shadow">
              <h2 className="text-lg font-semibold text-gray-900">Interactive Demo</h2>
              <p className="mt-2 text-gray-600">
                This sidebar is fully interactive. Click on different menu items to see 
                the navigation states and hover effects.
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg bg-white p-4 shadow">
                <h3 className="font-medium text-gray-900">Properties</h3>
                <p className="mt-1 text-sm text-gray-600">Manage your properties</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <h3 className="font-medium text-gray-900">Tenants</h3>
                <p className="mt-1 text-sm text-gray-600">Tenant management</p>
              </div>
              <div className="rounded-lg bg-white p-4 shadow">
                <h3 className="font-medium text-gray-900">Maintenance</h3>
                <p className="mt-1 text-sm text-gray-600">Track maintenance requests</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

// Dark theme variant
export const DarkTheme: Story = {
  args: {
    isExpanded: true,
  },
  parameters: {
    backgrounds: { default: 'dark' },
  },
  render: (args) => {
    const [expanded, setExpanded] = useState(args.isExpanded);
    
    return (
      <div className="flex h-screen bg-gray-900 dark">
        <DashboardSidebar
          {...args}
          isExpanded={expanded}
          onToggle={() => setExpanded(!expanded)}
        />
        <div className="flex-1 p-6">
          <div className="rounded-lg bg-gray-800 p-6 shadow">
            <h2 className="text-lg font-semibold text-white">Dark Mode</h2>
            <p className="mt-2 text-gray-300">
              The sidebar adapts to dark theme automatically using Tailwind's dark mode classes.
            </p>
          </div>
        </div>
      </div>
    );
  },
};