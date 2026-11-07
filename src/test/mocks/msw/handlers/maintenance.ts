import { http } from "msw";
import {
	MAINTENANCE_LIST_POSTGREST_ROW,
	MAINTENANCE_REQUEST_POSTGREST_ROW,
} from "#test/utils/test-data";
import { postgrestList, postgrestSingle, supabaseUrl } from "../utils";

export const maintenanceHandlers = [
	http.get(supabaseUrl("/rest/v1/maintenance_requests"), () => {
		return postgrestList([MAINTENANCE_LIST_POSTGREST_ROW], 1);
	}),
	http.post(supabaseUrl("/rest/v1/maintenance_requests"), () => {
		return postgrestSingle(MAINTENANCE_REQUEST_POSTGREST_ROW);
	}),
	http.patch(supabaseUrl("/rest/v1/maintenance_requests"), () => {
		return postgrestSingle(MAINTENANCE_REQUEST_POSTGREST_ROW);
	}),
	http.delete(supabaseUrl("/rest/v1/maintenance_requests"), () => {
		return postgrestSingle(MAINTENANCE_REQUEST_POSTGREST_ROW);
	}),
];
