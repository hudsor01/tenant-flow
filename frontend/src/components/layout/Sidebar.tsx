import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  CreditCard, 
  Wrench, 
  BarChart3, 
  Settings as SettingsIcon, 
  UserCircle,
  LogOut,
  ChevronDown,
  LucideIcon,
  DollarSign,
  FileText,
  Zap
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';

interface NavItem {
  name: string;
  icon: LucideIcon;
  path: string;
}

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar?: () => void;
}

interface NavItemComponentProps {
  item: NavItem;
  index: number;
  isOpen: boolean;
}

const navItems: NavItem[] = [
  { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'Properties', icon: Building2, path: '/properties' },
  { name: 'Tenants', icon: Users, path: '/tenants' },
  { name: 'Leases', icon: FileText, path: '/leases' },
  { name: 'Rent', icon: CreditCard, path: '/rent' },
  { name: 'Finances', icon: DollarSign, path: '/payments' },
  { name: 'Maintenance', icon: Wrench, path: '/maintenance' },
  { name: 'Automation', icon: Zap, path: '/automation' },
  { name: 'Reports', icon: BarChart3, path: '/reports' },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
  const { user, signOut } = useAuthStore();

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const NavItemComponent: React.FC<NavItemComponentProps> = ({ item, index, isOpen }) => (
    <motion.li
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.3 + index * 0.05, ease: "easeOut" }}
    >
      <NavLink
        to={item.path}
        data-testid={`nav-${item.name.toLowerCase()}`}
        className={({ isActive }) =>
          cn(
            'flex items-center px-4 py-3.5 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out font-sans group',
            'hover:bg-primary/10 hover:text-primary',
            isActive ? 'bg-primary/15 text-primary shadow-inner font-semibold' : 'text-muted-foreground hover:text-foreground'
          )
        }
      >
        <item.icon className={cn("w-5 h-5 mr-3.5 transition-colors", isOpen ? "opacity-100" : "opacity-0")} />
        <span className={cn("transition-opacity duration-200", isOpen ? "opacity-100" : "opacity-0")}>
          {item.name}
        </span>
      </NavLink>
    </motion.li>
  );

  return (
    <div className={cn(
      "h-full flex flex-col bg-card dark:bg-card shadow-2xl transition-all duration-300 ease-in-out border-r border-border",
      isOpen ? "w-72 p-5" : "w-0 p-0 overflow-hidden" 
    )}>
      {isOpen && (
        <>
          <motion.div 
            className="flex items-center justify-between mb-10"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          >
            <Link to="/dashboard" className="flex items-center space-x-2.5 group">
              <motion.div 
                initial={{ scale: 0.5, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}
                className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors"
              >
                <Building2 className="h-7 w-7 text-primary" />
              </motion.div>
              <motion.h1 
                className="text-2xl font-serif font-bold text-primary group-hover:text-primary/80 transition-colors"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" }}
              >
                TenantFlow
              </motion.h1>
            </Link>
          </motion.div>

          <nav data-testid="main-nav" className="flex-grow">
            <ul className="space-y-2.5">
              {navItems.map((item, index) => (
                <NavItemComponent key={item.name} item={item} index={index} isOpen={isOpen} />
              ))}
            </ul>
          </nav>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Separator className="my-5 bg-border/70" />

            <ul className="space-y-2.5">
              <motion.li
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.7, ease: "easeOut" }}
              >
                <NavLink
                  to="/settings"
                  className={({ isActive }) =>
                    cn(
                      'flex items-center px-4 py-3.5 text-sm font-medium rounded-lg transition-all duration-200 ease-in-out font-sans group',
                      'hover:bg-primary/10 hover:text-primary',
                      isActive ? 'bg-primary/15 text-primary shadow-inner font-semibold' : 'text-muted-foreground hover:text-foreground'
                    )
                  }
                >
                  <SettingsIcon className="w-5 h-5 mr-3.5" />
                  <span>Settings</span>
                </NavLink>
              </motion.li>
            </ul>
          
            <Separator className="my-5 bg-border/70" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div 
                  data-testid="user-menu"
                  className="flex items-center p-3 rounded-lg hover:bg-secondary cursor-pointer transition-colors duration-200 group"
                  whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.8, ease: "easeOut" }}
                >
                  <Avatar className="h-10 w-10 mr-3 border-2 border-primary/30 group-hover:border-primary/70 transition-colors">
                    <AvatarImage src={user?.avatarUrl || undefined} alt="User Avatar" />
                    <AvatarFallback>{user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow overflow-hidden">
                    <p className="text-sm font-semibold font-sans text-foreground truncate">{user?.name || 'User'}</p>
                    <p className="text-xs font-sans text-muted-foreground truncate">{user?.email}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground ml-2 group-hover:text-foreground transition-colors" />
                </motion.div>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-60 bg-popover border-border text-popover-foreground font-sans shadow-2xl rounded-xl mb-2">
                <DropdownMenuLabel className="font-semibold px-3 py-2 text-foreground">My Account</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border mx-1" />
                <DropdownMenuItem asChild className="hover:bg-accent focus:bg-accent cursor-pointer m-1 rounded-md">
                  <Link to="/profile" data-testid="user-profile-link" className="flex items-center px-2 py-1.5">
                    <UserCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem data-testid="settings-link" className="hover:bg-accent focus:bg-accent cursor-pointer m-1 rounded-md px-2 py-1.5">
                  <SettingsIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border mx-1" />
                <DropdownMenuItem 
                  data-testid="logout-button"
                  className="text-destructive hover:bg-destructive/10 focus:bg-destructive/10 focus:text-destructive cursor-pointer m-1 rounded-md px-2 py-1.5"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default Sidebar;