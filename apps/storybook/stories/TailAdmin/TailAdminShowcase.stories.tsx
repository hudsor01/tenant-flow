import type { Meta, StoryObj } from '@storybook/react';
import { 
  DashboardSidebar, 
  DashboardHeader, 
  TenantFlowDataTable,
  PropertyRevenueChart,
  PropertyForm,
  DashboardModal,
  ConfirmationModal
} from '@repo/frontend/src/components/tailadmin';
import { Button } from '@repo/frontend/src/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/frontend/src/components/ui/card';
import { useState } from 'react';
import { action } from '@storybook/addon-actions';

const meta: Meta = {
  title: 'TailAdmin/Showcase/TailAdminShowcase',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Complete showcase of TailAdmin dashboard components integrated together. This demonstrates how all components work together in a real dashboard interface.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

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
    status: "active" as const,
    amount: "$950",
    date: "2024-01-10",
  },
];

// Complete dashboard layout
export const CompleteDashboard: Story = {
  render: () => {
    const [sidebarExpanded, setSidebarExpanded] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);

    return (
      <div className="flex h-screen bg-gray-50">
        {/* Sidebar */}
        <DashboardSidebar
          isExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <DashboardHeader
            onMenuToggle={() => setSidebarExpanded(!sidebarExpanded)}
            title="Dashboard Overview"
            breadcrumbs={[
              { label: 'Dashboard' },
              { label: 'Overview' }
            ]}
          />

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Total Properties
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          24
                        </p>
                      </div>
                      <div className="ml-auto">
                        <div className="i-lucide-building w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Active Tenants
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          187
                        </p>
                      </div>
                      <div className="ml-auto">
                        <div className="i-lucide-users w-8 h-8 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Monthly Revenue
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          $248,500
                        </p>
                      </div>
                      <div className="ml-auto">
                        <div className="i-lucide-dollar-sign w-8 h-8 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                          Maintenance Requests
                        </p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          12
                        </p>
                      </div>
                      <div className="ml-auto">
                        <div className="i-lucide-wrench w-8 h-8 text-red-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Revenue Chart */}
              <PropertyRevenueChart />

              {/* Tenants Table */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Tenants</CardTitle>
                      <CardDescription>
                        Latest tenant activity and status updates
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        Export
                      </Button>
                      <Button size="sm" onClick={() => setShowModal(true)}>
                        Add Tenant
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <TenantFlowDataTable
                    data={sampleTenants}
                    columns={[
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
                              View
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => setShowConfirmation(true)}
                            >
                              Remove
                            </Button>
                          </div>
                        ),
                      },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </main>
        </div>

        {/* Modals */}
        <DashboardModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          title="Add New Tenant"
          description="Fill in the tenant information below"
        >
          <PropertyForm
            onSubmit={(data) => {
              action('tenant-added')(data);
              setShowModal(false);
            }}
            isEditing={false}
            className="border-none shadow-none p-0"
          />
        </DashboardModal>

        <ConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={() => {
            action('tenant-removed')();
            setShowConfirmation(false);
          }}
          title="Remove Tenant"
          message="Are you sure you want to remove this tenant? This action cannot be undone."
          confirmText="Remove"
          variant="danger"
        />
      </div>
    );
  },
};

// Components overview
export const ComponentsOverview: Story = {
  render: () => (
    <div className="space-y-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          TailAdmin Component Library
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Professional dashboard components for property management
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Sidebar Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Dashboard Sidebar</CardTitle>
            <CardDescription>
              Collapsible navigation with property management menu items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96 overflow-hidden rounded-lg border">
              <div className="flex h-full">
                <DashboardSidebar isExpanded={true} />
                <div className="flex-1 bg-gray-50 p-4">
                  <div className="rounded bg-white p-4 text-center shadow">
                    <p className="text-sm text-gray-600">Main Content Area</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Data Table</CardTitle>
            <CardDescription>
              Professional tables with status badges and user information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TenantFlowDataTable
              data={sampleTenants.slice(0, 2)}
              columns={[
                { key: 'user', title: 'Tenant' },
                { key: 'property', title: 'Property' },
                { key: 'status', title: 'Status' },
                { key: 'amount', title: 'Rent' },
              ]}
            />
          </CardContent>
        </Card>

        {/* Chart Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Charts</CardTitle>
            <CardDescription>
              Interactive charts with ApexCharts integration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PropertyRevenueChart className="border-none shadow-none p-0" />
          </CardContent>
        </Card>

        {/* Form Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Forms</CardTitle>
            <CardDescription>
              Validated forms with comprehensive field types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PropertyForm
              onSubmit={action('form-preview-submitted')}
              isEditing={false}
              className="border-none shadow-none p-0"
            />
          </CardContent>
        </Card>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="i-lucide-palette w-8 h-8 text-blue-600 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Professional Design</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Carefully crafted components with consistent styling
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="i-lucide-smartphone w-8 h-8 text-green-600 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Responsive</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Works perfectly on desktop, tablet, and mobile devices
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="i-lucide-shield-check w-8 h-8 text-purple-600 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Accessible</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Built with accessibility best practices in mind
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="i-lucide-zap w-8 h-8 text-yellow-600 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Performance</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Optimized for fast loading and smooth interactions
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="i-lucide-puzzle w-8 h-8 text-red-600 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Modular</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Use individual components or combine them together
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-gray-800">
          <div className="i-lucide-moon w-8 h-8 text-indigo-600 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Dark Mode</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Full dark mode support with automatic theme detection
          </p>
        </div>
      </div>
    </div>
  ),
};