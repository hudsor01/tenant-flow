// Updated: usePayments.ts now uses our new tRPC backend routers

import { useMemo } from "react";
import { trpc } from "../lib/trpcClient";
import { handleApiError } from "@/lib/utils";
import { toast } from "sonner";

// Payments queries
export const usePayments = (query?: any) => {
	return trpc.payments.list.useQuery(query || {}, {
		retry: 3,
		refetchInterval: 30000,
		staleTime: 5 * 60 * 1000,
	});
};

// Payments by lease with dedicated caching
export const usePaymentsByLease = (leaseId: string) => {
	return trpc.payments.list.useQuery({ leaseId }, {
		refetchInterval: 60000,
		enabled: !!leaseId,
		staleTime: 5 * 60 * 1000,
	});
};

// Single payment with smart caching
export const usePayment = (id: string) => {
	return trpc.payments.byId.useQuery({ id }, {
		enabled: !!id,
		staleTime: 5 * 60 * 1000,
	});
};

// Payment statistics with frequent updates
export const usePaymentAnalytics = () => {
	return trpc.payments.stats.useQuery(undefined, {
		retry: 3,
		refetchInterval: 2 * 60 * 1000,
		staleTime: 2 * 60 * 1000,
	});
};

// Enhanced payment calculations with memoization
export function usePaymentCalculations(payments?: any[]) {
	return useMemo(() => {
		if (!payments?.length) {
			return {
				totalAmount: 0,
				averageAmount: 0,
				paymentsByType: {},
				monthlyBreakdown: {},
				recentPayments: []
			}
		}

		const totalAmount = payments.reduce(
			(sum, payment) => sum + payment.amount,
			0
		)
		const averageAmount = totalAmount / payments.length

		const paymentsByType = payments.reduce(
			(acc, payment) => {
				acc[payment.type] = (acc[payment.type] || 0) + payment.amount
				return acc
			},
			{} as Record<string, number>
		)

		const monthlyBreakdown = payments.reduce(
			(acc, payment) => {
				const monthKey = new Date(payment.date)
					.toISOString()
					.slice(0, 7)
				if (!acc[monthKey]) {
					acc[monthKey] = { month: monthKey, amount: 0, count: 0 }
				}
				acc[monthKey].amount += payment.amount
				acc[monthKey].count += 1
				return acc
			},
			{} as Record<
				string,
				{ month: string; amount: number; count: number }
			>
		)

		const recentPayments = [...payments]
			.sort(
				(a, b) =>
					new Date(b.date).getTime() - new Date(a.date).getTime()
			)
			.slice(0, 10)

		return {
			totalAmount,
			averageAmount,
			paymentsByType,
			monthlyBreakdown,
			recentPayments,
			paymentCount: payments.length,
			averageMonthlyAmount:
				Object.values(monthlyBreakdown).reduce(
					(sum, month) => sum + month.amount,
					0
				) / Object.keys(monthlyBreakdown).length || 0
		}
	}, [payments])
}

// Payment mutations
export const useCreatePayment = () => {
	const utils = trpc.useUtils();
	return trpc.payments.create.useMutation({
		onSuccess: () => {
			utils.payments.list.invalidate();
			utils.payments.stats.invalidate();
			toast.success("Payment created successfully");
		},
		onError: (error) => {
			toast.error(handleApiError(error));
		},
	});
};

export const useUpdatePayment = () => {
	const utils = trpc.useUtils();
	return trpc.payments.update.useMutation({
		onSuccess: (updatedPayment) => {
			utils.payments.byId.setData({ id: updatedPayment.id }, updatedPayment);
			utils.payments.list.invalidate();
			utils.payments.stats.invalidate();
			toast.success("Payment updated successfully");
		},
		onError: (error) => {
			toast.error(handleApiError(error));
		},
	});
};

export const useDeletePayment = () => {
	const utils = trpc.useUtils();
	return trpc.payments.delete.useMutation({
		onSuccess: () => {
			utils.payments.list.invalidate();
			utils.payments.stats.invalidate();
			toast.success("Payment deleted successfully");
		},
		onError: (error) => {
			toast.error(handleApiError(error));
		},
	});
};

// Combined actions with enhanced capabilities
export function usePaymentActions() {
	const paymentsQuery = usePayments();
	const createMutation = useCreatePayment();
	const updateMutation = useUpdatePayment();
	const deleteMutation = useDeletePayment();

	return {
		// Query data
		data: paymentsQuery.data?.payments || [],
		loading: paymentsQuery.isLoading,
		error: paymentsQuery.error,
		refresh: paymentsQuery.refetch,

		// CRUD operations
		create: createMutation.mutate,
		update: updateMutation.mutate,
		remove: deleteMutation.mutate,

		// Loading states
		creating: createMutation.isPending,
		updating: updateMutation.isPending,
		deleting: deleteMutation.isPending,

		// Enhanced status
		anyLoading:
			paymentsQuery.isLoading ||
			createMutation.isPending ||
			updateMutation.isPending ||
			deleteMutation.isPending,
	};
}

// Payment stats hook
export function usePaymentStats() {
	return trpc.payments.stats.useQuery(undefined, {
		staleTime: 2 * 60 * 1000,
	});
}

// Real-time payments hook
export function useRealtimePayments(query?: any) {
	return trpc.payments.list.useQuery(
		query || {},
		{
			refetchInterval: 30000, // 30 seconds
			refetchIntervalInBackground: false,
		}
	);
}
