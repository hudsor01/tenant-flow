import type { Meta, StoryObj } from '@storybook/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantsDataTable } from '../../frontend/src/components/tenants/tenants-data-table';
import type { TenantWithLeases } from '@repo/shared';

// Mock data generator for tenants
const createMockTenant = (overrides: Partial<TenantWithLeases> = {}): TenantWithLeases => ({
  id: 'tenant-1',
  name: 'John Smith',
  email: 'john.smith@email.com',
  phone: '(555) 123-4567',
  orgId: 'org-1',
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  leases: [
    {
      id: 'lease-1',
      unitId: 'unit-1',
      tenantId: 'tenant-1',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      rentAmount: 1200,
      status: 'ACTIVE',
      orgId: 'org-1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      unit: {
        id: 'unit-1',
        unitNumber: '101',
        bedrooms: 2,
        bathrooms: 1,
        rent: 1200,
        deposit: 1200,
        status: 'OCCUPIED',
        propertyId: 'prop-1',
        orgId: 'org-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        property: {
          id: 'prop-1',
          name: 'Sunset Gardens Apartments',
          address: '123 Main Street',
          city: 'San Francisco',
          state: 'CA',
          zipCode: '94102',
          orgId: 'org-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      },
    },
  ],
  ...overrides,
});

// Mock hook for different states
const mockUseTenants = (mockData: {
  data?: TenantWithLeases[];
  isLoading?: boolean;
  error?: Error | null;
}) => ({
  data: mockData.data ?? [],
  isLoading: mockData.isLoading ?? false,
  error: mockData.error ?? null,
});

// Create a wrapper component that can mock the hook
const TenantsDataTableWrapper = ({ 
  mockData 
}: { 
  mockData: Parameters<typeof mockUseTenants>[0] 
}) => {
  // Mock the hook at module level
  const originalModule = require('../../frontend/src/hooks/api/use-tenants');
  originalModule.useTenants = () => mockUseTenants(mockData);
  
  return <TenantsDataTable />;
};

// Wrap with QueryClient provider
const StoryWrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false },
    },
  });
  
  return (
    <QueryClientProvider client={queryClient}>
      <div className="p-6 bg-background min-h-screen">
        {children}
      </div>
    </QueryClientProvider>
  );
};

const meta: Meta<typeof TenantsDataTableWrapper> = {
  title: 'TenantFlow/Tenants/DataTable',
  component: TenantsDataTableWrapper,
  decorators: [(Story) => <StoryWrapper><Story /></StoryWrapper>],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Comprehensive tenant management table displaying tenant information, lease status, property assignments, and action buttons. Features loading states, empty states, and error handling.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample tenant data for different scenarios
const mockTenants: TenantWithLeases[] = [
  createMockTenant({
    id: 'tenant-1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '(555) 123-4567',
  }),
  createMockTenant({
    id: 'tenant-2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@gmail.com',
    phone: '(555) 234-5678',
    leases: [
      {
        id: 'lease-2',
        unitId: 'unit-2',
        tenantId: 'tenant-2',
        startDate: '2024-02-01',
        endDate: '2025-01-31',
        rentAmount: 1500,
        status: 'ACTIVE',
        orgId: 'org-1',
        createdAt: '2024-02-01T00:00:00Z',
        updatedAt: '2024-02-01T00:00:00Z',
        unit: {
          id: 'unit-2',
          unitNumber: '202',
          bedrooms: 3,
          bathrooms: 2,
          rent: 1500,
          deposit: 1500,
          status: 'OCCUPIED',
          propertyId: 'prop-2',
          orgId: 'org-1',
          createdAt: '2024-02-01T00:00:00Z',
          updatedAt: '2024-02-01T00:00:00Z',
          property: {
            id: 'prop-2',
            name: 'Downtown Lofts',
            address: '456 Oak Avenue',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94103',
            orgId: 'org-1',
            createdAt: '2024-02-01T00:00:00Z',
            updatedAt: '2024-02-01T00:00:00Z',
          },
        },
      },
    ],
  }),
  createMockTenant({
    id: 'tenant-3',
    name: 'Michael Chen',
    email: 'michael.chen@email.com',
    phone: '(555) 345-6789',
    leases: [
      {
        id: 'lease-3',
        unitId: 'unit-3',
        tenantId: 'tenant-3',
        startDate: '2023-06-01',
        endDate: '2024-05-31', // Expired lease
        rentAmount: 1800,
        status: 'EXPIRED',
        orgId: 'org-1',
        createdAt: '2023-06-01T00:00:00Z',
        updatedAt: '2024-05-31T00:00:00Z',
        unit: {
          id: 'unit-3',
          unitNumber: '301',
          bedrooms: 2,
          bathrooms: 2,
          rent: 1800,
          deposit: 1800,
          status: 'VACANT',
          propertyId: 'prop-3',
          orgId: 'org-1',
          createdAt: '2023-06-01T00:00:00Z',
          updatedAt: '2024-05-31T00:00:00Z',
          property: {
            id: 'prop-3',
            name: 'Riverside View',
            address: '789 River Street',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94104',
            orgId: 'org-1',
            createdAt: '2023-06-01T00:00:00Z',
            updatedAt: '2024-05-31T00:00:00Z',
          },
        },
      },
    ],
  }),
  // Tenant with expiring lease (within 30 days)
  createMockTenant({
    id: 'tenant-4',
    name: 'Emma Rodriguez',
    email: 'emma.rodriguez@email.com',
    phone: '(555) 456-7890',
    leases: [
      {
        id: 'lease-4',
        unitId: 'unit-4',
        tenantId: 'tenant-4',
        startDate: '2024-01-01',
        endDate: '2024-09-15', // Expiring soon
        rentAmount: 1300,
        status: 'ACTIVE',
        orgId: 'org-1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        unit: {
          id: 'unit-4',
          unitNumber: '105',
          bedrooms: 1,
          bathrooms: 1,
          rent: 1300,
          deposit: 1300,
          status: 'OCCUPIED',
          propertyId: 'prop-1',
          orgId: 'org-1',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          property: {
            id: 'prop-1',
            name: 'Sunset Gardens Apartments',
            address: '123 Main Street',
            city: 'San Francisco',
            state: 'CA',
            zipCode: '94102',
            orgId: 'org-1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        },
      },
    ],
  }),
  // Tenant without phone number
  createMockTenant({
    id: 'tenant-5',
    name: 'David Wilson',
    email: 'david.wilson@email.com',
    phone: undefined,
  }),
];

// Default story with active tenants
export const Default: Story = {
  args: {
    mockData: { data: mockTenants },
  },
};

// Single active tenant
export const SingleTenant: Story = {
  args: {
    mockData: { data: [mockTenants[0]] },
  },
};

// Mixed tenant statuses
export const MixedStatuses: Story = {
  args: {
    mockData: { data: mockTenants },
  },
};

// Large tenant list
export const LargeTenantList: Story = {
  args: {
    mockData: { 
      data: Array.from({ length: 15 }, (_, i) => 
        createMockTenant({
          id: `tenant-${i + 1}`,
          name: `Tenant ${i + 1}`,
          email: `tenant${i + 1}@email.com`,
          phone: `(555) ${String(i + 1).padStart(3, '0')}-${String(i + 1000).padStart(4, '0')}`,
        })
      )
    },
  },
};

// Tenants with no active leases
export const InactiveTenants: Story = {
  args: {
    mockData: { 
      data: [
        createMockTenant({
          id: 'tenant-inactive-1',
          name: 'Former Tenant One',
          email: 'former1@email.com',
          leases: [],
        }),
        createMockTenant({
          id: 'tenant-inactive-2',
          name: 'Former Tenant Two',
          email: 'former2@email.com',
          leases: [],
        }),
      ]
    },
  },
};

// Empty state - no tenants
export const EmptyState: Story = {
  args: {
    mockData: { data: [] },
  },
};

// Loading state
export const Loading: Story = {
  args: {
    mockData: { isLoading: true },
  },
};

// Error state
export const Error: Story = {
  args: {
    mockData: { error: new Error('Failed to load tenants') },
  },
};