import { HttpResponse, http } from "msw";
import {
	MAINTENANCE_DETAIL_POSTGREST_ROW,
	MAINTENANCE_LIST_POSTGREST_ROW,
	MAINTENANCE_REQUEST_POSTGREST_ROW,
} from "#test/utils/test-data";
import {
	postgrestList,
	postgrestSingle,
	supabaseUrl,
	wantsOneRow,
} from "../utils";

/**
 * Each answer is the row the query or mutation's own select returns, so its
 * mapper accepts it (`src/test/__tests__/msw-maintenance-contract.test.ts`):
 * the list and the detail read with GET, a create inserts and selects its own
 * columns, an update selects the detail's columns, and a delete selects none.
 */
export const maintenanceHandlers = [
	http.get(supabaseUrl("/rest/v1/maintenance_requests"), ({ request }) => {
		return wantsOneRow(request)
			? postgrestSingle(MAINTENANCE_DETAIL_POSTGREST_ROW)
			: postgrestList([MAINTENANCE_LIST_POSTGREST_ROW], 1);
	}),
	http.post(supabaseUrl("/rest/v1/maintenance_requests"), () => {
		return postgrestSingle(MAINTENANCE_REQUEST_POSTGREST_ROW);
	}),
	http.patch(supabaseUrl("/rest/v1/maintenance_requests"), () => {
		return postgrestSingle(MAINTENANCE_DETAIL_POSTGREST_ROW);
	}),
	http.delete(supabaseUrl("/rest/v1/maintenance_requests"), () => {
		return new HttpResponse(null, { status: 204 });
	}),
];
