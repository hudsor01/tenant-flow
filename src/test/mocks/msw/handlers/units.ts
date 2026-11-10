import { http } from "msw";
import { DEFAULT_UNIT, UNIT_LIST_POSTGREST_ROW } from "#test/utils/test-data";
import {
	postgrestList,
	postgrestSingle,
	supabaseUrl,
	wantsOneRow,
} from "../utils";

export const unitHandlers = [
	// The list embeds each unit's property (unitQueries.list); a detail read
	// selects the unit's own columns.
	http.get(supabaseUrl("/rest/v1/units"), ({ request }) => {
		return wantsOneRow(request)
			? postgrestSingle(DEFAULT_UNIT)
			: postgrestList([UNIT_LIST_POSTGREST_ROW], 1);
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
