import {
	keepPreviousData,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";

import { tenantQueries } from "./query-keys/tenant-keys";

export function useTenantList(page: number = 1, limit: number = 50) {
	const queryClient = useQueryClient();
	const offset = (page - 1) * limit;
	const queryOpts = tenantQueries.list({ limit, offset });

	return useQuery({
		...queryOpts,
		select: (response) => {
			response.data?.forEach?.((tenant) => {
				const detailKey = tenantQueries.detail(tenant.id).queryKey;
				const leaseKey = tenantQueries.withLease(tenant.id).queryKey;

				// TenantWithLeaseInfo extends Tenant, so this is type-safe
				if (!queryClient.getQueryData(detailKey)) {
					queryClient.setQueryData(detailKey, tenant);
				}
				if (!queryClient.getQueryData(leaseKey)) {
					queryClient.setQueryData(leaseKey, tenant);
				}
			});

			return {
				data: response.data || [],
				total: response.total || 0,
				page,
				limit,
			};
		},
		placeholderData: keepPreviousData,
	});
}

export function useAllTenants() {
	const queryClient = useQueryClient();

	return useQuery({
		...tenantQueries.allTenants(),
		select: (response) => {
			response.forEach((tenant) => {
				const existingDetail = queryClient.getQueryData(
					tenantQueries.detail(tenant.id).queryKey,
				);
				const existingWithLease = queryClient.getQueryData(
					tenantQueries.withLease(tenant.id).queryKey,
				);

				// TenantWithLeaseInfo extends Tenant, so this is type-safe
				if (!existingDetail) {
					queryClient.setQueryData(
						tenantQueries.detail(tenant.id).queryKey,
						tenant,
					);
				}
				if (!existingWithLease) {
					queryClient.setQueryData(
						tenantQueries.withLease(tenant.id).queryKey,
						tenant,
					);
				}
			});

			return response;
		},
	});
}
