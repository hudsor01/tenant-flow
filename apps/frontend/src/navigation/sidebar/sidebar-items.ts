import {
  Building2,
  Users,
  FileText,
  Wrench,
  CreditCard,
  BarChart3,
  Settings,
  LayoutDashboard,
  Banknote,
  Home,
  UserCheck,
  Calendar,
  type LucideIcon,
} from "lucide-react";

export interface NavSubItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavMainItem {
  title: string;
  url: string;
  icon?: LucideIcon;
  subItems?: NavSubItem[];
  comingSoon?: boolean;
  newTab?: boolean;
  isNew?: boolean;
}

export interface NavGroup {
  id: number;
  label?: string;
  items: NavMainItem[];
}

export const sidebarItems: NavGroup[] = [
  {
    id: 1,
    label: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard/default",
        icon: LayoutDashboard,
      },
      {
        title: "Analytics",
        url: "/dashboard/analytics",
        icon: BarChart3,
        comingSoon: true,
      },
    ],
  },
  {
    id: 2,
    label: "Property Management",
    items: [
      {
        title: "Properties",
        url: "/dashboard/properties",
        icon: Building2,
        comingSoon: true,
      },
      {
        title: "Units",
        url: "/dashboard/units",
        icon: Home,
        comingSoon: true,
      },
      {
        title: "Tenants",
        url: "/dashboard/tenants",
        icon: Users,
        comingSoon: true,
      },
      {
        title: "Leases",
        url: "/dashboard/leases",
        icon: FileText,
        comingSoon: true,
      },
    ],
  },
  {
    id: 3,
    label: "Operations",
    items: [
      {
        title: "Maintenance",
        url: "/dashboard/maintenance",
        icon: Wrench,
        comingSoon: true,
      },
      {
        title: "Payments",
        url: "/dashboard/payments",
        icon: CreditCard,
        comingSoon: true,
      },
      {
        title: "Finance",
        url: "/dashboard/finance",
        icon: Banknote,
      },
    ],
  },
  {
    id: 4,
    label: "System",
    items: [
      {
        title: "Settings",
        url: "/dashboard/settings",
        icon: Settings,
        comingSoon: true,
      },
    ],
  },
];
