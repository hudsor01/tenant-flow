import { http } from "msw";
import {
	DEFAULT_LEASE,
	LEASE_DETAIL_POSTGREST_ROW,
} from "#test/utils/test-data";
import {
	postgrestList,
	postgrestSingle,
	supabaseUrl,
	wantsOneRow,
} from "../utils";

export const leaseHandlers = [
	// A detail read embeds the lease's tenant and unit (leaseQueries.detail).
	http.get(supabaseUrl("/rest/v1/leases"), ({ request }) => {
		return wantsOneRow(request)
			? postgrestSingle(LEASE_DETAIL_POSTGREST_ROW)
			: postgrestList([DEFAULT_LEASE], 1);
	}),
	http.post(supabaseUrl("/rest/v1/leases"), () => {
		return postgrestSingle(DEFAULT_LEASE);
	}),
	http.patch(supabaseUrl("/rest/v1/leases"), () => {
		return postgrestSingle(DEFAULT_LEASE);
	}),
	http.delete(supabaseUrl("/rest/v1/leases"), () => {
		return postgrestSingle(DEFAULT_LEASE);
	}),

	// Lease tenants
	http.get(supabaseUrl("/rest/v1/lease_tenants"), () => {
		return postgrestList([], 0);
	}),
];
