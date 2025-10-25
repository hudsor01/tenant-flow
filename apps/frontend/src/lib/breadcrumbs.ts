import type { BreadcrumbItem } from '@/components/ui/breadcrumbs';

// Map of route segments to readable labels
const LABEL_MAP: Record<string, string> = {
  manage: 'Dashboard',
  properties: 'Properties',
  tenants: 'Tenants',
  units: 'Units',
  leases: 'Leases',
  maintenance: 'Maintenance',
  analytics: 'Analytics',
  financial: 'Financial',
  reports: 'Reports',
  settings: 'Settings',
  new: 'Create New',
  edit: 'Edit',
  tenant: 'Tenant Portal',
  payments: 'Payments',
  documents: 'Documents',
  profile: 'Profile',
  lease: 'Lease Info',
  onboarding: 'Onboarding',
};

export function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  let currentPath = '';
  const breadcrumbs: BreadcrumbItem[] = [];

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`;

    // Use mapped label or capitalize segment
    const label = LABEL_MAP[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);

    // Skip UUIDs (typical format: 8-4-4-4-12 characters)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment);
    if (isUUID) {
      // For UUIDs, use the previous segment's label + "Details" or just "Details"
      const previousLabel = breadcrumbs[index - 1]?.label || 'Details';
      breadcrumbs.push({ href: currentPath, label: `${previousLabel} Details` });
    } else {
      breadcrumbs.push({ href: currentPath, label });
    }
  });

  return breadcrumbs;
}
