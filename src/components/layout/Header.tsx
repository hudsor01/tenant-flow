import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CurrentUserAvatar } from '@/components/current-user-avatar';
import { Menu, Settings, UserCircle, LogOut, Building } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
// import NotificationDropdown from '@/components/notifications/NotificationDropdown';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen }) => {
  const { user, signOut } = useAuthStore();

  const handleLogout = async (): Promise<void> => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };


  return (
    <header className="h-20 flex items-center justify-between px-6 bg-card text-foreground shadow-lg sticky top-0 z-40 border-b border-border">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="mr-4 text-muted-foreground hover:text-primary hover:bg-accent">
          <Menu className="h-6 w-6" />
        </Button>
        {!isSidebarOpen && (
           <Link to="/dashboard" className="flex items-center space-x-2">
            <motion.div 
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <Building className="h-7 w-7 text-primary" />
            </motion.div>
            <motion.h1 
              className="text-xl font-serif font-bold text-primary"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              TenantFlow
            </motion.h1>
          </Link>
        )}
      </div>

      <div className="flex items-center space-x-4">
        {/* <NotificationDropdown /> */}
        {/* Temporarily disabled due to excessive API calls */}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="rounded-full">
              <div className="border-2 border-primary/50 hover:border-primary transition-colors rounded-full">
                <CurrentUserAvatar />
              </div>
            </motion.button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60 bg-popover border-border text-popover-foreground mt-2 shadow-2xl rounded-xl font-sans">
            <DropdownMenuLabel className="font-semibold px-3 py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-foreground">
                  {user?.name || user?.email?.split('@')[0] || 'User'}
                  {/* Debug info - remove after testing */}
                  {process.env.NODE_ENV === 'development' && (
                    <span className="text-xs text-red-500 block">
                      Debug: name="{user?.name}" id="{user?.id}"
                    </span>
                  )}
                </p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border mx-1" />
            <DropdownMenuItem asChild className="hover:bg-accent focus:bg-accent cursor-pointer m-1 rounded-md">
              <Link to="/profile" className="flex items-center px-2 py-1.5">
                <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>Profile</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-accent focus:bg-accent cursor-pointer m-1 rounded-md px-2 py-1.5">
              <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border mx-1" />
            <DropdownMenuItem 
              onClick={handleLogout}
              className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer m-1 rounded-md px-2 py-1.5"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Header;