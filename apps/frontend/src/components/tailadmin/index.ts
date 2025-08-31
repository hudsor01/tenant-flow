/**
 * TailAdmin Dashboard Components
 * 
 * Professional dashboard components adapted from TailAdmin V2 for TenantFlow.
 * These components are specifically designed for dashboard and admin panel functionality,
 * complementing Magic UI components used for marketing pages.
 */

// Layout Components
export { DashboardSidebar } from './dashboard-sidebar'
export { DashboardHeader } from './dashboard-header'

// Data Display Components  
export { 
  TenantFlowDataTable,
  PropertiesDataTable,
  Table as TailAdminTable,
  TableHeader as TailAdminTableHeader,
  TableBody as TailAdminTableBody,
  TableRow as TailAdminTableRow,
  TableCell as TailAdminTableCell
} from './data-table'

// Chart Components
export { 
  RevenueChart,
  PropertyRevenueChart
} from './revenue-chart'

// Form Components
export {
  DashboardForm,
  FormField as TailAdminFormField,
  FormActions,
  PropertyForm
} from './dashboard-form'

// Modal Components
export {
  DashboardModal,
  ConfirmationModal,
  PropertyDeleteModal
} from './dashboard-modal'

// Component Categories for Documentation
export const TailAdminComponentCategories = {
  // Layout and Navigation
  layout: [
    'DashboardSidebar', 'DashboardHeader'
  ],
  
  // Data Display and Tables
  dataDisplay: [
    'TenantFlowDataTable', 'PropertiesDataTable', 'Table', 'TableHeader', 'TableBody', 'TableRow', 'TableCell'
  ],
  
  // Charts and Analytics
  charts: [
    'RevenueChart', 'PropertyRevenueChart'
  ],
  
  // Forms and Input
  forms: [
    'DashboardForm', 'FormField', 'FormActions', 'PropertyForm'
  ],
  
  // Modals and Overlays
  modals: [
    'DashboardModal', 'ConfirmationModal', 'PropertyDeleteModal'
  ]
} as const

/**
 * Usage Guidelines
 * 
 * TailAdmin components should be used for:
 * - Dashboard layouts and navigation
 * - Data tables and admin interfaces  
 * - Form-heavy administrative pages
 * - Analytics and reporting interfaces
 * 
 * For marketing pages, use Magic UI components instead:
 * - Landing page animations and CTAs
 * - Feature highlights and hero sections
 * - Interactive marketing elements
 */

export const UsageExamples = {
  // Dashboard layout with sidebar and header
  dashboardLayout: `
    import { DashboardSidebar, DashboardHeader } from '@/components/tailadmin'
    
    <div className="flex h-screen bg-gray-50">
      <DashboardSidebar isExpanded={true} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardHeader title="Properties" />
        <main className="flex-1 overflow-y-auto p-6">
          {/* Dashboard content */}
        </main>
      </div>
    </div>
  `,
  
  // Data table for properties
  propertyTable: `
    import { TenantFlowDataTable } from '@/components/tailadmin'
    
    <TenantFlowDataTable
      data={properties}
      columns={[
        { key: 'user', title: 'Tenant' },
        { key: 'property', title: 'Property' },
        { key: 'unit', title: 'Unit' },
        { key: 'status', title: 'Status' },
        { key: 'amount', title: 'Rent' }
      ]}
    />
  `
} as const