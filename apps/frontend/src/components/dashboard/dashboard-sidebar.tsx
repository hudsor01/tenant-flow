'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
} from '@/components/ui/sidebar/';
import { 
  Home, 
  Building, 
  Users, 
  FileText, 
  Wrench, 
  BarChart3, 
  Settings,
  LogOut,
  User
} from 'lucide-react';

const navigation = [
  { id: 'dashboard', name: 'Dashboard', href: '/dashboard', icon: Home },
  { id: 'properties', name: 'Properties', href: '/(dashboard)/properties', icon: Building },
  { id: 'tenants', name: 'Tenants', href: '/tenants', icon: Users },
  { id: 'leases', name: 'Leases', href: '/leases', icon: FileText },
  { id: 'maintenance', name: 'Maintenance', href: '/maintenance', icon: Wrench },
  { id: 'reports', name: 'Reports', href: '/reports', icon: BarChart3 },
  { id: 'settings', name: 'Settings', href: '/settings', icon: Settings },
];

interface DashboardSidebarProps {
  className?: string;
}

export function DashboardSidebar({ className }: DashboardSidebarProps) {
  const pathname = usePathname();

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar collapsible="icon" className={className}>
        <SidebarHeader>
          <Link href="/dashboard" className="flex items-center gap-2 px-2">
            <Building className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl group-data-[collapsible=icon]:hidden">
              TenantFlow
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                  
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        tooltip={item.name}
                      >
                        <Link href={item.href}>
                          <Icon className="h-4 w-4" />
                          <span>{item.name}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Profile">
                <Link href="/profile">
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Logout">
                <button onClick={() => console.log('Logout')}>
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      
      {/* Trigger button for mobile/collapsed state */}
      <div className="absolute top-4 right-4 z-50 lg:hidden">
        <SidebarTrigger />
      </div>
    </SidebarProvider>
  );
}

// Keep the original export name for compatibility
export { DashboardSidebar as Sidebar };