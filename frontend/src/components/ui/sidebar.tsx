// Re-export all sidebar components from the modular structure
// This maintains backward compatibility while using the new decomposed architecture

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSkeleton,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	SidebarProvider,
	SidebarRail,
	SidebarSeparator,
	SidebarTrigger
} from './sidebar/index'

// Export hook separately to avoid react-refresh warning
// eslint-disable-next-line react-refresh/only-export-components
export { useSidebar } from './sidebar/index'
