import { http } from "msw";
import { DEFAULT_MAINTENANCE_REQUEST } from "#test/utils/test-data";
import { postgrestList, postgrestSingle, supabaseUrl } from "../utils";

export const maintenanceHandlers = [
	http.get(supabaseUrl("/rest/v1/maintenance_requests"), () => {
		return postgrestList([DEFAULT_MAINTENANCE_REQUEST], 1);
	}),
	http.post(supabaseUrl("/rest/v1/maintenance_requests"), () => {
		return postgrestSingle(DEFAULT_MAINTENANCE_REQUEST);
	}),
	http.patch(supabaseUrl("/rest/v1/maintenance_requests"), () => {
		return postgrestSingle(DEFAULT_MAINTENANCE_REQUEST);
	}),
	http.delete(supabaseUrl("/rest/v1/maintenance_requests"), () => {
		return postgrestSingle(DEFAULT_MAINTENANCE_REQUEST);
	}),
];
