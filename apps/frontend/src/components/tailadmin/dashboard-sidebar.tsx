"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
// import Image from "next/image"; // TODO: Add user avatar support later
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FileText , Users , Wrench , DollarSign , Building , Settings , BarChart3 , LayoutDashboard, User } from 'lucide-react'
// Navigation item type
type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  subItems?: { 
    name: string; 
    path: string; 
    pro?: boolean; 
    new?: boolean; 
  }[];
};

// Props interface
interface DashboardSidebarProps {
  isExpanded?: boolean;
  isMobileOpen?: boolean;
  onToggle?: () => void;
  className?: string;
}

// TenantFlow-specific navigation items
const tenantFlowNavItems: NavItem[] = [
  {
    icon: (
      <LayoutDashboard className="w-5 h-5" />
    ),
    name: "Dashboard",
    path: "/dashboard",
  },
  {
    icon: (
      <Building className="w-5 h-5" />
    ),
    name: "Properties",
    subItems: [
      { name: "All Properties", path: "/dashboard/properties" },
      { name: "Units", path: "/dashboard/units" },
      { name: "Add Property", path: "/dashboard/properties/new" },
    ],
  },
  {
    icon: (
      <Users className="w-5 h-5" />
    ),
    name: "Tenants",
    subItems: [
      { name: "All Tenants", path: "/dashboard/tenants" },
      { name: "Add Tenant", path: "/dashboard/tenants/new" },
      { name: "Tenant Applications", path: "/dashboard/tenants/applications" },
    ],
  },
  {
    icon: (
      <Wrench className="w-5 h-5" />
    ),
    name: "Maintenance",
    subItems: [
      { name: "All Requests", path: "/dashboard/maintenance" },
      { name: "Pending", path: "/dashboard/maintenance?status=pending" },
      { name: "In Progress", path: "/dashboard/maintenance?status=in-progress" },
    ],
  },
  {
    icon: (
      <FileText className="w-5 h-5" />
    ),
    name: "Leases",
    subItems: [
      { name: "All Leases", path: "/dashboard/leases" },
      { name: "Expiring Soon", path: "/dashboard/leases/expiring" },
      { name: "Create Lease", path: "/dashboard/leases/new" },
    ],
  },
];

const managementItems: NavItem[] = [
  {
    icon: (
      <DollarSign className="w-5 h-5" />
    ),
    name: "Billing",
    subItems: [
      { name: "Payments", path: "/dashboard/billing/payments" },
      { name: "Invoices", path: "/dashboard/billing/invoices" },
      { name: "Subscription", path: "/dashboard/billing/subscription" },
    ],
  },
  {
    icon: (
      <BarChart3 className="w-5 h-5" />
    ),
    name: "Reports",
    subItems: [
      { name: "Financial Report", path: "/dashboard/reports/financial" },
      { name: "Occupancy Report", path: "/dashboard/reports/occupancy" },
      { name: "Maintenance Report", path: "/dashboard/reports/maintenance" },
    ],
  },
  {
    icon: (
      <Settings className="w-5 h-5" />
    ),
    name: "Settings",
    subItems: [
      { name: "Profile", path: "/dashboard/settings/profile" },
      { name: "Preferences", path: "/dashboard/settings/preferences" },
      { name: "Notifications", path: "/dashboard/settings/notifications" },
    ],
  },
];

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  isExpanded = true,
  isMobileOpen = false,
  onToggle: _onToggle,
  className,
}) => {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: "main" | "management";
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  // Handle submenu toggle
  const handleSubmenuToggle = (index: number, menuType: "main" | "management") => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (
        prevOpenSubmenu &&
        prevOpenSubmenu.type === menuType &&
        prevOpenSubmenu.index === index
      ) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  // Auto-open submenu if current path matches
  useEffect(() => {
    let submenuMatched = false;
    ["main", "management"].forEach((menuType) => {
      const items = menuType === "main" ? tenantFlowNavItems : managementItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({
                type: menuType as "main" | "management",
                index,
              });
              submenuMatched = true;
            }
          });
        }
      });
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [pathname, isActive]);

  // Set submenu heights
  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  // Render menu items
  const renderMenuItems = (navItems: NavItem[], menuType: "main" | "management") => (
    <ul className="flex flex-col gap-1">
      {navItems.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <button
              onClick={() => handleSubmenuToggle(index, menuType)}
              className={cn(
                "flex items-center w-full gap-3 px-3 py-2.5 font-medium rounded-lg text-sm transition-colors",
                openSubmenu?.type === menuType && openSubmenu?.index === index
                  ? "bg-primary/10 text-primary"
                  : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
                !isExpanded && !isHovered && "lg:justify-center"
              )}
            >
              <span className="flex-shrink-0">
                {nav.icon}
              </span>
              {(isExpanded || isHovered || isMobileOpen) && (
                <>
                  <span className="flex-1 text-left">{nav.name}</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 transition-transform",
                      openSubmenu?.type === menuType && openSubmenu?.index === index
                        ? "rotate-180"
                        : ""
                    )}
                  />
                </>
              )}
            </button>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 font-medium rounded-lg text-sm transition-colors",
                  isActive(nav.path)
                    ? "bg-primary/10 text-primary"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800",
                  !isExpanded && !isHovered && "lg:justify-center"
                )}
              >
                <span className="flex-shrink-0">
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span>{nav.name}</span>
                )}
              </Link>
            )
          )}
          
          {/* Submenu */}
          {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
            <div
              ref={(el) => {
                subMenuRefs.current[`${menuType}-${index}`] = el;
              }}
              className="overflow-hidden transition-all duration-300"
              style={{
                height:
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? `${subMenuHeight[`${menuType}-${index}`]}px`
                    : "0px",
              }}
            >
              <ul className="mt-1 space-y-0.5 ml-9">
                {nav.subItems.map((subItem) => (
                  <li key={subItem.name}>
                    <Link
                      href={subItem.path}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                        isActive(subItem.path)
                          ? "bg-primary/10 text-primary"
                          : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800/50"
                      )}
                    >
                      <span className="flex-1">{subItem.name}</span>
                      <div className="flex items-center gap-1">
                        {subItem.new && (
                          <span className="px-1.5 py-0.5 text-xs font-medium uppercase bg-blue-100 text-blue-600 rounded dark:bg-blue-900/30 dark:text-blue-400">
                            new
                          </span>
                        )}
                        {subItem.pro && (
                          <span className="px-1.5 py-0.5 text-xs font-medium uppercase bg-purple-100 text-purple-600 rounded dark:bg-purple-900/30 dark:text-purple-400">
                            pro
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-50 flex flex-col h-screen bg-white border-r border-gray-200 dark:bg-gray-950 dark:border-gray-800 transition-all duration-300 ease-in-out",
        isExpanded || isMobileOpen
          ? "w-64"
          : isHovered
          ? "w-64"
          : "w-16",
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        className
      )}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo */}
      <div className={cn(
        "flex items-center p-6 border-b border-gray-200 dark:border-gray-800",
        !isExpanded && !isHovered && !isMobileOpen && "justify-center"
      )}>
        <Link href="/dashboard" className="flex items-center gap-2">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">T</span>
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-white">
                TenantFlow
              </span>
            </>
          ) : (
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4">
        <nav className="space-y-6">
          {/* Main Navigation */}
          <div>
            <h2 className={cn(
              "mb-3 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400",
              !isExpanded && !isHovered && !isMobileOpen && "text-center"
            )}>
              {isExpanded || isHovered || isMobileOpen ? "Main" : "•••"}
            </h2>
            {renderMenuItems(tenantFlowNavItems, "main")}
          </div>

          {/* Management */}
          <div>
            <h2 className={cn(
              "mb-3 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400",
              !isExpanded && !isHovered && !isMobileOpen && "text-center"
            )}>
              {isExpanded || isHovered || isMobileOpen ? "Management" : "•••"}
            </h2>
            {renderMenuItems(managementItems, "management")}
          </div>
        </nav>
      </div>

      {/* Footer - User Info */}
      {(isExpanded || isHovered || isMobileOpen) && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <Link
            href="/dashboard/settings/profile"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
              <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                Profile
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                Settings & Account
              </p>
            </div>
          </Link>
        </div>
      )}
    </aside>
  );
};

export default DashboardSidebar;