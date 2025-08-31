'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  Home, 
  Users, 
  FileText, 
  Wrench, 
  Receipt, 
  FolderOpen, 
  User, 
  Settings, 
  LogOut,
  Menu, 
  X, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Plus,
  Bell,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

// Types
interface Property {
  id: string;
  name: string;
  address: string;
  units: number;
  occupancy: number;
  revenue: number;
  status: 'active' | 'maintenance' | 'vacant';
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  phone: string;
  unit: string;
  property: string;
  leaseEnd: string;
  status: 'active' | 'pending' | 'expired';
  avatar?: string;
}

interface MaintenanceRequest {
  id: string;
  title: string;
  property: string;
  unit: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in-progress' | 'completed';
  createdAt: string;
  tenant: string;
}

interface NavigationItem {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  badge?: string;
}

// Mock Data - Enhanced for TenantFlow
const mockProperties: Property[] = [
  { id: '1', name: 'Sunset Heights', address: '123 Oak Avenue, Downtown', units: 24, occupancy: 95, revenue: 52000, status: 'active' },
  { id: '2', name: 'Metro Commons', address: '456 Main Street, Midtown', units: 36, occupancy: 88, revenue: 78000, status: 'active' },
  { id: '3', name: 'Garden View Residences', address: '789 Pine Boulevard, Eastside', units: 18, occupancy: 100, revenue: 45000, status: 'active' },
  { id: '4', name: 'Riverside Apartments', address: '321 River Road, Westbank', units: 42, occupancy: 83, revenue: 89000, status: 'maintenance' },
];

const mockTenants: Tenant[] = [
  { id: '1', name: 'Sarah Johnson', email: 'sarah@email.com', phone: '555-0123', unit: 'A-301', property: 'Sunset Heights', leaseEnd: '2024-12-31', status: 'active' },
  { id: '2', name: 'Michael Chen', email: 'michael@email.com', phone: '555-0124', unit: 'B-205', property: 'Metro Commons', leaseEnd: '2024-11-15', status: 'active' },
  { id: '3', name: 'Emma Rodriguez', email: 'emma@email.com', phone: '555-0125', unit: 'C-104', property: 'Garden View Residences', leaseEnd: '2024-10-30', status: 'pending' },
  { id: '4', name: 'David Thompson', email: 'david@email.com', phone: '555-0126', unit: 'D-412', property: 'Riverside Apartments', leaseEnd: '2025-03-15', status: 'active' },
];

const mockMaintenanceRequests: MaintenanceRequest[] = [
  { id: '1', title: 'Kitchen Faucet Leak', property: 'Sunset Heights', unit: 'A-301', priority: 'high', status: 'in-progress', createdAt: '2024-01-15', tenant: 'Sarah Johnson' },
  { id: '2', title: 'Air Conditioning Repair', property: 'Metro Commons', unit: 'B-205', priority: 'urgent', status: 'open', createdAt: '2024-01-14', tenant: 'Michael Chen' },
  { id: '3', title: 'Window Screen Replacement', property: 'Garden View Residences', unit: 'C-104', priority: 'low', status: 'completed', createdAt: '2024-01-13', tenant: 'Emma Rodriguez' },
  { id: '4', title: 'Electrical Outlet Issue', property: 'Riverside Apartments', unit: 'D-412', priority: 'medium', status: 'open', createdAt: '2024-01-12', tenant: 'David Thompson' },
];

const navigationItems: NavigationItem[] = [
  { id: "dashboard", name: "Dashboard", icon: Home, href: "/dashboard" },
  { id: "properties", name: "Properties", icon: Building2, href: "/properties", badge: "4" },
  { id: "tenants", name: "Tenants", icon: Users, href: "/tenants" },
  { id: "leases", name: "Leases", icon: FileText, href: "/leases" },
  { id: "maintenance", name: "Maintenance", icon: Wrench, href: "/maintenance", badge: "3" },
  { id: "receipts", name: "Receipts", icon: Receipt, href: "/receipts" },
  { id: "documents", name: "Documents", icon: FolderOpen, href: "/documents" },
  { id: "profile", name: "Profile", icon: User, href: "/profile" },
  { id: "settings", name: "Settings", icon: Settings, href: "/settings" },
];

// Sidebar Component with TenantFlow Branding
interface SidebarProps {
  className?: string;
}

function PropertySidebar({ className = "" }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeItem, setActiveItem] = useState("dashboard");

  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsOpen(true);
      } else {
        setIsOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const handleItemClick = (itemId: string) => {
    setActiveItem(itemId);
    if (window.innerWidth < 768) {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={toggleSidebar}
        className="fixed top-6 left-6 z-50 p-3 rounded-lg bg-card border border-border shadow-lg md:hidden hover:bg-accent transition-all duration-200"
        aria-label="Toggle sidebar"
      >
        {isOpen ? 
          <X className="h-5 w-5 text-foreground" /> : 
          <Menu className="h-5 w-5 text-foreground" />
        }
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden" 
          onClick={toggleSidebar} 
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 h-full bg-card/95 backdrop-blur-xl border-r border-border z-40 transition-all duration-300 ease-in-out flex flex-col shadow-xl
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          ${isCollapsed ? "w-20" : "w-72"}
          md:translate-x-0 md:static md:z-auto
          ${className}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                <Building2 className="text-primary-foreground h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-foreground text-lg">TenantFlow</span>
                <span className="text-xs text-muted-foreground">Property Suite</span>
              </div>
            </div>
          )}

          {isCollapsed && (
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center mx-auto shadow-lg">
              <Building2 className="text-primary-foreground h-5 w-5" />
            </div>
          )}

          <button
            onClick={toggleCollapse}
            className="hidden md:flex p-2 rounded-md hover:bg-accent transition-all duration-200"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Search Bar */}
        {!isCollapsed && (
          <div className="px-4 py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search..."
                className="pl-10 bg-muted/50 border-border"
              />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <ul className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeItem === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item.id)}
                    className={`
                      w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 group
                      ${isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }
                      ${isCollapsed ? "justify-center px-2" : ""}
                    `}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <div className="flex items-center justify-center min-w-[20px]">
                      <Icon
                        className={`
                          h-5 w-5 flex-shrink-0
                          ${isActive 
                            ? "text-primary" 
                            : "text-muted-foreground group-hover:text-foreground"
                          }
                        `}
                      />
                    </div>
                    
                    {!isCollapsed && (
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-sm font-medium ${isActive ? "font-semibold" : ""}`}>
                          {item.name}
                        </span>
                        {item.badge && (
                          <Badge size="sm" variant={isActive ? "default" : "secondary"}>
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Profile Section */}
        <div className="mt-auto border-t border-border">
          <div className={`border-b border-border ${isCollapsed ? 'py-4 px-2' : 'p-4'}`}>
            {!isCollapsed ? (
              <div className="flex items-center px-3 py-2 rounded-lg bg-muted/50 hover:bg-accent transition-colors duration-200">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="https://avatar.vercel.sh/tenantflow" alt="Property Manager" />
                  <AvatarFallback>TF</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 ml-3">
                  <p className="text-sm font-medium text-foreground truncate">Property Manager</p>
                  <p className="text-xs text-muted-foreground truncate">admin@tenantflow.app</p>
                </div>
                <div className="w-2 h-2 bg-green-500 rounded-full ml-2" title="Online" />
              </div>
            ) : (
              <div className="flex justify-center">
                <div className="relative">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="https://avatar.vercel.sh/tenantflow" alt="Property Manager" />
                    <AvatarFallback>TF</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-card" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4">
            <button
              onClick={() => handleItemClick("logout")}
              className={`
                w-full flex items-center rounded-lg text-left transition-all duration-200 group
                text-destructive hover:bg-destructive/10
                ${isCollapsed ? "justify-center p-2.5" : "space-x-3 px-3 py-2.5"}
              `}
              title={isCollapsed ? "Logout" : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span className="text-sm">Sign out</span>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Dashboard Stats Component
function DashboardStats() {
  const stats = [
    {
      title: "Total Properties",
      value: "4",
      change: "+25%",
      trend: "up",
      icon: Building2,
      color: "text-blue-600 dark:text-blue-400"
    },
    {
      title: "Total Units",
      value: "120",
      change: "+12%",
      trend: "up",
      icon: Home,
      color: "text-green-600 dark:text-green-400"
    },
    {
      title: "Occupancy Rate",
      value: "91.5%",
      change: "+2.8%",
      trend: "up",
      icon: Users,
      color: "text-purple-600 dark:text-purple-400"
    },
    {
      title: "Monthly Revenue",
      value: "$264,000",
      change: "+8.5%",
      trend: "up",
      icon: DollarSign,
      color: "text-orange-600 dark:text-orange-400"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown;
        
        return (
          <Card key={index} className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <div className="flex items-center mt-2">
                    <TrendIcon className={`h-4 w-4 mr-1 ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
                    <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">vs last month</span>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-muted/50">
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// Properties Table Component
function PropertiesTable() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Properties</CardTitle>
          <CardDescription>Manage your property portfolio</CardDescription>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Property
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockProperties.map((property) => (
            <div key={property.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{property.name}</h4>
                  <p className="text-sm text-muted-foreground">{property.address}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">{property.units}</p>
                  <p className="text-xs text-muted-foreground">Units</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">{property.occupancy}%</p>
                  <p className="text-xs text-muted-foreground">Occupied</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">${property.revenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Revenue</p>
                </div>
                <Badge variant={property.status === 'active' ? 'success' : 'warning'}>
                  {property.status}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Maintenance Requests Component
function MaintenanceRequests() {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-progress': return <Clock className="h-4 w-4 text-blue-600" />;
      case 'open': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Maintenance Requests</CardTitle>
          <CardDescription>Track and manage maintenance issues</CardDescription>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockMaintenanceRequests.map((request) => (
            <div key={request.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="flex items-center justify-center">
                  {getStatusIcon(request.status)}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">{request.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    {request.property} - Unit {request.unit} • {request.tenant}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Badge variant={getPriorityColor(request.priority)}>
                  {request.priority}
                </Badge>
                <Badge variant="outline">
                  {request.status}
                </Badge>
                <span className="text-sm text-muted-foreground">{request.createdAt}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="h-4 w-4 mr-2" />
                      Update Status
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <User className="h-4 w-4 mr-2" />
                      Assign Technician
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Recent Activity Component
function RecentActivity() {
  const activities = [
    { id: '1', type: 'lease', message: 'New lease signed for Unit A-301', time: '2 hours ago', icon: FileText },
    { id: '2', type: 'maintenance', message: 'Maintenance request completed for Unit B-205', time: '4 hours ago', icon: Wrench },
    { id: '3', type: 'payment', message: 'Rent payment received from Sarah Johnson', time: '6 hours ago', icon: DollarSign },
    { id: '4', type: 'tenant', message: 'New tenant application submitted', time: '1 day ago', icon: Users },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates across your portfolio</CardDescription>
        </div>
        <Button variant="outline" size="sm">View All</Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="w-9 h-9 bg-muted/50 rounded-lg flex items-center justify-center">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-foreground font-medium">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Main Dashboard Component
function PropertyManagementDashboard() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-background">
      <PropertySidebar />
      
      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ease-in-out ${isCollapsed ? 'md:ml-20' : 'md:ml-72'}`}>
        {/* Header */}
        <header className="bg-card/95 backdrop-blur-xl border-b border-border px-6 py-4 ml-16 md:ml-0 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back! Here's what's happening with your properties.</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Today
              </Button>
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src="https://avatar.vercel.sh/tenantflow" alt="Property Manager" />
                <AvatarFallback>TF</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="p-6 ml-16 md:ml-0 space-y-6 pb-6">
          {/* Stats Cards */}
          <DashboardStats />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Properties and Maintenance - Takes 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              <PropertiesTable />
              <MaintenanceRequests />
            </div>

            {/* Sidebar Content - Takes 1 column */}
            <div className="space-y-6">
              <RecentActivity />
              
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks and shortcuts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Property
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="h-4 w-4 mr-2" />
                    Add New Tenant
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Create Lease
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Wrench className="h-4 w-4 mr-2" />
                    Schedule Maintenance
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default PropertyManagementDashboard;