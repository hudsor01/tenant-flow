/**
 * The sidebar spec (`tests/e2e/tests/owner/app-shell-sidebar.spec.ts`)
 * answers each `user_tour_progress` write locally, so no production row is
 * written. These tests run the app's own `updateTourProgress` through a real
 * supabase-js client whose fetch returns what the spec sends
 * (`tests/e2e/lib/tour-progress-write.ts`), so the answer is held to what the
 * client needs. They sit here, not under `tests/e2e/lib/__tests__`, because
 * the E2E tsconfig's rootDir cannot reach `src`.
 *
 * The spec used to answer 201 with an empty body. postgrest-js reads that as
 * `data: null`, `updateTourProgress` threw at `data.tour_key`, and the write
 * failed in the client: an in-progress one rejected, and completion fell back
 * to localStorage (66.2-39 cycle 3, G49).
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateTourProgress } from "#hooks/api/use-tour-progress";
import { tourProgressWriteBody } from "../../../../tests/e2e/lib/tour-progress-write";

const { holder } = vi.hoisted(() => ({
	holder: {
		client: null as unknown,
	},
}));

vi.mock("#lib/supabase/client", () => ({
	createClient: () => holder.client,
}));

vi.mock("#lib/supabase/get-cached-user", () => ({
	getCachedUser: async () => ({ id: "owner-a" }),
}));

interface Sent {
	method: string;
	url: string;
	body: unknown;
}

/** A supabase-js client whose writes are answered with `answer(url, body)`. */
function clientAnswering(answer: (url: string, body: unknown) => string) {
	const sent: Sent[] = [];
	const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = input instanceof Request ? input.url : String(input);
		const body: unknown =
			typeof init?.body === "string" ? JSON.parse(init.body) : null;
		sent.push({ method: init?.method ?? "GET", url, body });
		return new Response(answer(url, body), {
			status: 201,
			headers: { "content-type": "application/json" },
		});
	};
	holder.client = createSupabaseClient(
		"https://project.supabase.example",
		"sb_publishable_test",
		{
			auth: { persistSession: false, autoRefreshToken: false },
			global: { fetch },
		},
	);
	return sent;
}

beforeEach(() => {
	holder.client = null;
	vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("the sidebar spec's answer to a tour progress write", () => {
	it("is the written row's selected columns, which updateTourProgress returns", async () => {
		const sent = clientAnswering(tourProgressWriteBody);
		const result = await updateTourProgress("owner-onboarding", {
			status: "in_progress",
			current_step: 2,
		});
		expect(sent).toHaveLength(1);
		expect(sent[0]?.method).toBe("POST");
		const written = sent[0]?.body;
		expect(written).toMatchObject({
			user_id: "owner-a",
			tour_key: "owner-onboarding",
			status: "in_progress",
			current_step: 2,
		});
		expect(result).toEqual({
			tour_key: "owner-onboarding",
			status: "in_progress",
			current_step: 2,
			completed_at: null,
			skipped_at: null,
			last_seen_at: expect.any(String),
		});
		expect(
			JSON.parse(tourProgressWriteBody(sent[0]?.url ?? "", written)),
		).toEqual(result);
	});

	it("an empty 201 body, the old answer, rejects an in-progress write in the client", async () => {
		clientAnswering(() => "");
		await expect(
			updateTourProgress("owner-onboarding", {
				status: "in_progress",
				current_step: 1,
			}),
		).rejects.toMatchObject({
			message: expect.stringContaining("tour_key"),
		});
	});
});
