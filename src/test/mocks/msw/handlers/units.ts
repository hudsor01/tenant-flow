import { http } from "msw";
import { DEFAULT_UNIT } from "#test/utils/test-data";
import { postgrestList, postgrestSingle, supabaseUrl } from "../utils";

export const unitHandlers = [
	http.get(supabaseUrl("/rest/v1/units"), () => {
		return postgrestList([DEFAULT_UNIT], 1);
	}),
	http.post(supabaseUrl("/rest/v1/units"), () => {
		return postgrestSingle(DEFAULT_UNIT);
	}),
	http.patch(supabaseUrl("/rest/v1/units"), () => {
		return postgrestSingle(DEFAULT_UNIT);
	}),
	http.delete(supabaseUrl("/rest/v1/units"), () => {
		return postgrestSingle(DEFAULT_UNIT);
	}),
];
