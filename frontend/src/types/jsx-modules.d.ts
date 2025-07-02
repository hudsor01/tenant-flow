// Type declarations for JSX modules
declare module '@/components/Layout' {
  import { ReactNode } from 'react';
  
  interface LayoutProps {
    children: ReactNode;
  }
  
  const Layout: React.FC<LayoutProps>;
  export default Layout;
}

declare module '@/components/layout/MainLayout.tsx' {
  import { ReactNode } from 'react';
  
  interface LayoutProps {
    children: ReactNode;
  }
  
  const Layout: React.FC<LayoutProps>;
  export default Layout;
}

declare module '@/pages/DashboardPage' {
  const DashboardPage: React.FC;
  export default DashboardPage;
}

declare module '@/pages/DashboardPage/DashboardPage' {
  const DashboardPage: React.FC;
  export default DashboardPage;
}

declare module '@/pages/Properties/PropertiesPage' {
  const PropertiesPage: React.FC;
  export default PropertiesPage;
}

declare module '@/pages/Tenants/TenantsPage' {
  const TenantsPage: React.FC;
  export default TenantsPage;
}

declare module '@/pages/RentPage' {
  const RentPage: React.FC;
  export default RentPage;
}

declare module '@/pages/Maintenance/MaintenancePage' {
  const MaintenancePage: React.FC;
  export default MaintenancePage;
}

declare module '@/pages/ReportsPage' {
  const ReportsPage: React.FC;
  export default ReportsPage;
}

declare module '@/pages/SettingsPage' {
  const SettingsPage: React.FC;
  export default SettingsPage;
}

declare module '@/pages/UserProfilePage' {
  const UserProfilePage: React.FC;
  export default UserProfilePage;
}