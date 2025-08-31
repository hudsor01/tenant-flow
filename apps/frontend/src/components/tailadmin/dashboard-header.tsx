"use client";

import React, { useState } from "react";
import { Bell, Search, Menu, Settings, User, LogOut, Users, Wrench, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
interface DashboardHeaderProps {
  onMenuToggle?: () => void;
  onSearchToggle?: () => void;
  className?: string;
  title?: string;
  breadcrumbs?: { label: string; href?: string }[];
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: "maintenance" | "payment" | "tenant" | "system";
}

const sampleNotifications: NotificationItem[] = [
  {
    id: "1",
    title: "New Maintenance Request",
    message: "Unit 101 - Plumbing issue reported",
    time: "2m ago",
    read: false,
    type: "maintenance",
  },
  {
    id: "2",
    title: "Payment Received",
    message: "John Doe paid $1,200 rent",
    time: "1h ago",
    read: false,
    type: "payment",
  },
  {
    id: "3",
    title: "New Tenant Application",
    message: "Application for Downtown Lofts Unit 205",
    time: "3h ago",
    read: true,
    type: "tenant",
  },
];

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  onMenuToggle,
  onSearchToggle,
  className,
  title,
  breadcrumbs,
}) => {
  const [notifications] = useState<NotificationItem[]>(sampleNotifications);
  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "maintenance":
        return <Wrench className="w-4 h-4" />;
      case "payment":
        return <DollarSign className="w-4 h-4" />;
      case "tenant":
        return <Users className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "maintenance":
        return "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400";
      case "payment":
        return "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400";
      case "tenant":
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-600 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  return (
    <header className={cn(
      "sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-gray-800 dark:bg-gray-950/95 dark:supports-[backdrop-filter]:bg-gray-950/60",
      className
    )}>
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left section - Mobile menu toggle + Title/Breadcrumbs */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="hidden lg:block">
            {breadcrumbs ? (
              <nav className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                {breadcrumbs.map((item, index) => (
                  <React.Fragment key={index}>
                    {index > 0 && <span>/</span>}
                    <span className={cn(
                      index === breadcrumbs.length - 1 
                        ? "text-gray-900 dark:text-white font-medium" 
                        : "hover:text-gray-700 dark:hover:text-gray-300"
                    )}>
                      {item.label}
                    </span>
                  </React.Fragment>
                ))}
              </nav>
            ) : title ? (
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h1>
            ) : null}
          </div>
        </div>

        {/* Right section - Search, Notifications, User menu */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSearchToggle}
            className="hidden sm:inline-flex"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <h3 className="font-semibold">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer border-b last:border-b-0",
                        !notification.read && "bg-blue-50/50 dark:bg-blue-950/20"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                        getNotificationColor(notification.type)
                      )}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                            {notification.time}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                      )}
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <div className="border-t p-2">
                  <Button variant="ghost" size="sm" className="w-full text-xs">
                    View all notifications
                  </Button>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative">
                <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center dark:bg-gray-700">
                  <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-3 py-2 border-b">
                <p className="font-medium text-sm">Property Manager</p>
                <p className="text-xs text-gray-500">admin@tenantflow.com</p>
              </div>
              <DropdownMenuItem className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;