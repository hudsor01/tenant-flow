// Refactored: useLeases.ts now uses tRPC hooks instead of legacy apiClient

import { useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "@/lib/api";
import { queryKeys, cacheConfig } from "@/lib/query-keys";
import { handleApiError } from "@/lib/utils";
import { toast } from "sonner";
import type { LeaseWithDetails } from "@/types/api";
import type { LeaseQuery } from "@/types/query-types";

// 🎯 Main leases resource with enhanced features
export const useLeases = (query?: LeaseQuery) => {
	return trpc.leases.getAll.useQuery(query, {
		...cacheConfig.business,
		retry: 3,
		refetchInterval: 60000,
	});
};

// 🎯 Single lease with smart caching
export const useLease = (id: string) => {
	return trpc.leases.getById.useQuery(id, {
		...cacheConfig.business,
		retry: 2,
		enabled: !!id,
	});
};

// 🎯 Lease statistics with auto-polling
export const useLeaseStats = () => {
	return trpc.leases.getStats.useQuery(undefined, {
		...cacheConfig.business,
		retry: 2,
		refetchInterval: 2 * 60 * 1000,
	});
};

// 🎯 Expiring leases with configurable threshold
export const useExpiringLeases = (days = 30) => {
	return trpc.leases.getExpiring.useQuery(days, {
		...cacheConfig.business,
		refetchInterval: 5 * 60 * 1000,
	});
};

// 🎯 Lease calculations - Enhanced with memoization
export function useLeaseCalculations(lease?: LeaseWithDetails) {
	return useMemo(() => {
		if (!lease) return null;

		const now = Date.now();
		const endDate = lease.endDate ? new Date(lease.endDate).getTime() : null;
		const startDate = lease.startDate
			? new Date(lease.startDate).getTime()
			: null;

		const daysUntilExpiry = endDate
			? Math.ceil((endDate - now) / (1000 * 60 * 60 * 24))
			: null;

		return {
			daysUntilExpiry,

			isExpiringSoon: (days = 30) =>
				daysUntilExpiry !== null &&
				daysUntilExpiry <= days &&
				daysUntilExpiry > 0,

			isExpired: endDate ? endDate < now : false,

			monthsRemaining: endDate
				? Math.max(
					0,
					Math.ceil((endDate - now) / (1000 * 60 * 60 * 24 * 30))
				)
				: null,

			totalRentAmount:
				lease.rentAmount && startDate && endDate
					? (() => {
						const start = new Date(startDate);
						const end = new Date(endDate);
						const months =
							(end.getFullYear() - start.getFullYear()) * 12 +
							(end.getMonth() - start.getMonth());
						return lease.rentAmount * months;
					})()
					: null,
		};
	}, [lease]);
}

// 🎯 Lease mutations
export const useCreateLease = () => {
	const queryClient = useQueryClient();

	return trpc.leases.create.useMutation({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.leases.all });
			toast.success("Lease created successfully");
		},
		onError: (error) => {
			toast.error(handleApiError(error));
		},
	});
};

export const useUpdateLease = () => {
	const queryClient = useQueryClient();

	return trpc.leases.update.useMutation({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.leases.all });
			toast.success("Lease updated successfully");
		},
		onError: (error) => {
			toast.error(handleApiError(error));
		},
	});
};

export const useDeleteLease = () => {
	const queryClient = useQueryClient();

	return trpc.leases.delete.useMutation({
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: queryKeys.leases.all });
			toast.success("Lease deleted successfully");
		},
		onError: (error) => {
			toast.error(handleApiError(error));
		},
	});
};

// 🎯 Combined actions with ALL the superpowers
export function useLeaseActions() {
	const leasesQuery = useLeases();
	const createMutation = useCreateLease();
	const updateMutation = useUpdateLease();
	const deleteMutation = useDeleteLease();

	return {
		// Query data
		data: leasesQuery.data || [],
		loading: leasesQuery.isLoading,
		error: leasesQuery.error,
		refresh: leasesQuery.refetch,

		// CRUD operations
		create: createMutation.mutate,
		update: updateMutation.mutate,
		remove: deleteMutation.mutate,

		// Loading states
		creating: createMutation.isPending,
		updating: updateMutation.isPending,
		deleting: deleteMutation.isPending,

		// Enhanced loading states
		anyLoading:
			leasesQuery.isLoading ||
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending,
	};
}
