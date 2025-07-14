// Refactored: useTenantData now uses tRPC and supabase for auth, no legacy apiClient

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/utils";
import { supabase } from "@/lib/trpcClient";

export interface TenantDashboardData {
	tenant: {
		id: string;
		name: string;
		email: string;
		phone?: string;
	};
	property: {
		id: string;
		name: string;
		address: string;
		city: string;
		state: string;
		zipCode?: string;
		unit: {
			id: string;
			unitNumber: string;
			rent: number;
		};
	};
	lease: {
		id: string;
		startDate: string;
		endDate: string;
		rentAmount: number;
		status: string;
		securityDeposit?: number;
	};
	currentLease?: {
		id: string;
		startDate: string;
		endDate: string;
		rentAmount: number;
		status: string;
	};
	propertyOwner: {
		name: string;
		email: string;
		phone?: string;
	};
	upcomingPayments: {
		id: string;
		type: string;
		amount: number;
		dueDate: string;
		status: string;
	}[];
	maintenanceRequests: {
		completedAt: string;
		id: string;
		title: string;
		description?: string;
		status: string;
		priority: string;
		createdAt: string;
		updatedAt: string;
	}[];
	paymentHistory: {
		id: string;
		amount: number;
		paymentDate: string;
		type: string;
		status: string;
	}[];
}

export function useTenantData() {
	return useQuery({
		queryKey: queryKeys.tenants.dashboard(),
		queryFn: async (): Promise<TenantDashboardData | null> => {
			// Tenant dashboard API endpoint placeholder
			// This will be implemented when tenant portal endpoints are ready
			return {
				tenant: {
					id: "",
					name: "",
					email: "",
					phone: "",
				},
				property: {
					id: "",
					name: "",
					address: "",
					city: "",
					state: "",
					zipCode: "",
					unit: {
						id: "",
						unitNumber: "",
						rent: 0,
					},
				},
				lease: {
					id: "",
					startDate: "",
					endDate: "",
					rentAmount: 0,
					status: "",
					securityDeposit: 0,
				},
				currentLease: undefined,
				propertyOwner: {
					name: "",
					email: "",
					phone: "",
				},
				upcomingPayments: [],
				maintenanceRequests: [],
				paymentHistory: [],
			};
		},
		enabled: !!supabase.auth.getSession,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
	});
}

export function useCreateMaintenanceRequest() {
	return async (request: {
		title: string;
		description: string;
		priority: string;
		unitId: string;
	}) => {
		// Maintenance request creation placeholder - will use tRPC endpoint when available
		console.log("Creating maintenance request:", request);
		throw new Error("Maintenance request API endpoint not yet implemented");
	};
}
