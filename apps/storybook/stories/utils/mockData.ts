// Mock data for Storybook stories
export const mockProperties = [
  {
    id: '1',
    name: 'Sunset Apartments',
    address: '123 Main St, Downtown',
    type: 'Apartment',
    units: 24,
    occupied: 22,
    rent: 2500,
    status: 'Active',
    occupancyRate: 92,
    image: null,
  },
  {
    id: '2', 
    name: 'Oak Grove Condos',
    address: '456 Oak Ave, Midtown',
    type: 'Condo',
    units: 18,
    occupied: 16,
    rent: 3200,
    status: 'Active',
    occupancyRate: 89,
    image: null,
  },
  {
    id: '3',
    name: 'Pine Valley Homes',
    address: '789 Pine Rd, Suburbs',
    type: 'Single Family',
    units: 12,
    occupied: 11,
    rent: 2800,
    status: 'Active', 
    occupancyRate: 92,
    image: null,
  }
];

export const mockTenants = [
  {
    id: '1',
    name: 'John & Jane Smith',
    unit: '2B',
    rent: 1800,
    deposit: 3600,
    leaseStart: '2024-01-01',
    leaseEnd: '2024-12-31',
    lastPayment: '2024-12-01',
    status: 'Active',
    email: 'smiths@example.com',
    phone: '555-0123',
  },
  {
    id: '2',
    name: 'Michael Johnson',
    unit: '3A',
    rent: 2200,
    deposit: 4400,
    leaseStart: '2024-03-15',
    leaseEnd: '2025-03-14',
    lastPayment: '2024-12-01',
    status: 'Active',
    email: 'mjohnson@example.com',
    phone: '555-0456',
  }
];

export const mockMaintenanceRequests = [
  {
    id: '1',
    title: 'Leaky Faucet',
    description: 'Kitchen sink faucet is leaking continuously. Water damage potential.',
    unit: '3A',
    tenant: 'Michael Johnson',
    priority: 'High',
    status: 'Open',
    category: 'Plumbing',
    createdAt: '2024-12-13T18:00:00Z',
    updatedAt: '2024-12-13T18:00:00Z',
  },
  {
    id: '2',
    title: 'Broken Air Conditioning',
    description: 'AC unit not cooling properly. Temperature stays above 75°F.',
    unit: '2B',
    tenant: 'John & Jane Smith',
    priority: 'Medium',
    status: 'In Progress',
    category: 'HVAC',
    createdAt: '2024-12-12T10:30:00Z',
    updatedAt: '2024-12-13T09:15:00Z',
  },
  {
    id: '3',
    title: 'Flickering Lights',
    description: 'Living room lights flickering intermittently.',
    unit: '1C',
    tenant: 'Sarah Wilson',
    priority: 'Low',
    status: 'Completed',
    category: 'Electrical',
    createdAt: '2024-12-10T14:20:00Z',
    updatedAt: '2024-12-11T16:45:00Z',
  }
];

export const mockStats = {
  totalRevenue: 24531,
  activeTenants: 142,
  totalProperties: 24,
  maintenanceRequests: 7,
  occupancyRate: 92,
  trends: {
    revenue: 12.5,
    tenants: 8.2,
    properties: 2.0,
    maintenance: -15,
    occupancy: 3.2,
  }
};

// Mock functions for interactive stories
export const mockActions = {
  onPropertyClick: (id: string) => console.log('Property clicked:', id),
  onTenantClick: (id: string) => console.log('Tenant clicked:', id),
  onMaintenanceClick: (id: string) => console.log('Maintenance request clicked:', id),
  onEditClick: (type: string, id: string) => console.log('Edit clicked:', type, id),
  onDeleteClick: (type: string, id: string) => console.log('Delete clicked:', type, id),
  onStatusChange: (id: string, status: string) => console.log('Status changed:', id, status),
};

// Plan types for billing components
export const mockPlanTypes = {
  FREETRIAL: 'FREETRIAL',
  STARTER: 'STARTER', 
  PROFESSIONAL: 'PROFESSIONAL',
  ENTERPRISE: 'ENTERPRISE',
} as const;

export type MockPlanType = keyof typeof mockPlanTypes;/* Build marker: Wed Aug 13 15:55:56 CDT 2025 */
