// Export all maintenance hooks from the new optimized version
export {
	useMaintenanceRequests,
	useMaintenanceByUnit,
	useMaintenanceRequest,
	useMaintenanceStats,
	useUrgentMaintenanceRequests,
	useCreateMaintenanceRequest,
	useUpdateMaintenanceRequest,
	useDeleteMaintenanceRequest,
	useMaintenanceActions
} from './trpc/useMaintenance'
