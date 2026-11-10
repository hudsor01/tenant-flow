import { http } from "msw";
import { DEFAULT_TENANT } from "#test/utils/test-data";
import {
	postgrestList,
	postgrestSingle,
	supabaseUrl,
	wantsOneRow,
} from "../utils";

export const tenantHandlers = [
	http.get(supabaseUrl("/rest/v1/tenants"), ({ request }) => {
		return wantsOneRow(request)
			? postgrestSingle(DEFAULT_TENANT)
			: postgrestList([DEFAULT_TENANT], 1);
	}),
	http.post(supabaseUrl("/rest/v1/tenants"), () => {
		return postgrestSingle(DEFAULT_TENANT);
	}),
	http.patch(supabaseUrl("/rest/v1/tenants"), () => {
		return postgrestSingle(DEFAULT_TENANT);
	}),
	http.delete(supabaseUrl("/rest/v1/tenants"), () => {
		return postgrestSingle(DEFAULT_TENANT);
	}),
];
