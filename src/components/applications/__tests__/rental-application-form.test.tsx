/**
 * `RentalApplicationForm` — the public applicant form (APPLY-02, APPLY-06).
 *
 * WHAT THIS FILE CAN AND CANNOT DECIDE. jsdom computes NO layout. Every
 * geometric property this surface depends on — the 48px inputs, the 96px
 * textareas, the honeypot's off-screen position, the disclaimer sitting above
 * the submit control in PIXELS, the single-column stacking at 375px — is
 * unfalsifiable here, and asserting the class string that is supposed to produce
 * it proves spelling, not behaviour. Those belong to plan 66-17's Playwright
 * spec (UI-SPEC §E). What this file owns is everything jsdom can genuinely
 * decide: DOM ORDER, attribute values, what survives a failed submit, and what
 * the component puts on the wire.
 *
 * EVERY ABSENCE ASSERTION CARRIES A POSITIVE CONTROL. "No SSN field is present"
 * passes against an empty render, a crashed render and a typo in the selector.
 * So each absence check is paired, in the same test, with a query that MUST find
 * something using the same mechanism.
 */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HONEYPOT_FIELD } from "../../../../supabase/functions/_shared/application-guards";
import { RentalApplicationForm } from "../rental-application-form";

/**
 * UI-SPEC E-8, verbatim. Plan 66-17 runs this exact string against the shipped
 * page; running it here too is deliberate duplication of a REQUIREMENT, because
 * a forbidden field could be introduced at the component layer or at the page
 * layer and only one of the two checks would see it.
 */
const FORBIDDEN_SELECTOR = [
	'input[name*="ssn" i]',
	'input[name*="social" i]',
	'input[type="file"]',
	'input[name*="dob" i]',
	'input[name*="birth" i]',
	'input[name*="bank" i]',
	'input[name*="account" i]',
	'input[name*="routing" i]',
	'input[name*="card" i]',
	'input[name*="license" i]',
	'input[name*="passport" i]',
	'input[name*="govid" i]',
	'input[name*="government" i]',
].join(", ");

const APPLICANT_EMAIL = "dana.reyes@example.com";

/** The 13 non-boolean required fields. `certified` is clicked separately. */
const REQUIRED_VALUES: ReadonlyArray<readonly [string, string]> = [
	["first_name", "Dana"],
	["last_name", "Reyes"],
	["email", APPLICANT_EMAIL],
	["phone", "5125550143"],
	["desired_move_in_date", "2026-09-01"],
	["current_street", "812 Pecan Street"],
	["current_city", "Austin"],
	["current_state", "TX"],
	["current_postal_code", "78702"],
	["gross_monthly_income", "4200"],
	["occupant_count", "2"],
	["reference_1_name", "Marta Quinn"],
	["reference_1_phone", "5125550188"],
];

const fetchMock = vi.fn();

/**
 * A server-minted `issued_at`, deliberately nothing like a plausible reading of
 * this machine's clock, so a component that fell back to `Date.now()` cannot
 * accidentally produce it.
 */
const SERVER_ISSUED_AT = 1_500_000_000_000;

function renderForm(issuedAt: number | null = SERVER_ISSUED_AT) {
	return render(
		<RentalApplicationForm
			token="tok_live_abcdef"
			propertyLabel="Pecan Grove"
			unitLabel="4B"
			issuedAt={issuedAt}
		/>,
	);
}

function control(name: string): HTMLInputElement {
	const element = document.querySelector<HTMLInputElement>(`[name="${name}"]`);
	if (element === null) throw new Error(`No control named ${name} is rendered`);
	return element;
}

function submitButton(): HTMLButtonElement {
	return screen.getByRole("button", {
		name: /Submit application|Submitting/,
	}) as HTMLButtonElement;
}

/** Fills every required field. Leaves the attestation deliberately unchecked. */
function fillRequiredFields(skip?: string): void {
	for (const [name, value] of REQUIRED_VALUES) {
		if (name === skip) continue;
		fireEvent.change(control(name), { target: { value } });
	}
}

/** Whatever the per-field `FieldError` primitive rendered, if anything. */
function fieldErrors(container: HTMLElement): string[] {
	return Array.from(
		container.querySelectorAll<HTMLElement>('[data-slot="field-error"]'),
	).map((node) => node.textContent ?? "");
}

function checkAttestation(): void {
	fireEvent.click(screen.getByRole("checkbox"));
}

function jsonResponse(body: unknown, status = 200): Response {
	return {
		status,
		json: async () => body,
	} as unknown as Response;
}

/**
 * Callable stand-ins for every client-side store a draft could be written to.
 * They are installed rather than spied on because this environment ships none
 * of them, and a spy on a store that does not exist can never fire.
 */
function installStorageProbe() {
	const setItem = vi.fn();
	const openDatabase = vi.fn();
	const store = {
		length: 0,
		clear: vi.fn(),
		getItem: () => null,
		key: () => null,
		removeItem: vi.fn(),
		setItem,
	} satisfies Storage;
	vi.stubGlobal("localStorage", store);
	vi.stubGlobal("sessionStorage", store);
	vi.stubGlobal("indexedDB", { open: openDatabase });
	return { setItem, openDatabase };
}

function lastRequestBody(): Record<string, unknown> {
	const call = fetchMock.mock.calls.at(-1);
	if (call === undefined) throw new Error("fetch was never called");
	const init = call[1] as RequestInit;
	return JSON.parse(String(init.body)) as Record<string, unknown>;
}

beforeEach(() => {
	fetchMock.mockReset();
	fetchMock.mockResolvedValue(jsonResponse({ success: true, reason: null }));
	vi.stubGlobal("fetch", fetchMock);
	// jsdom has no layout, so scrollTo is unimplemented and logs to the virtual
	// console. The confirmation view calls it on mount.
	vi.stubGlobal("scrollTo", vi.fn());
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	// The stamp tests spy on Date.now. Leaving one installed would freeze the
	// clock for every file that runs after this one in the same worker.
	vi.restoreAllMocks();
});

describe("RentalApplicationForm — the D-06 forbidden-field contract", () => {
	it("renders none of the forbidden inputs, while the same query mechanism finds the fields that SHOULD exist", () => {
		const { container } = renderForm();

		// Positive control FIRST: if this is zero the absence assertion below is
		// meaningless, because it would also pass on an empty or crashed render.
		expect(
			container.querySelectorAll('input[name*="name" i]').length,
		).toBeGreaterThan(0);
		expect(container.querySelectorAll("input").length).toBeGreaterThan(20);

		expect(container.querySelectorAll(FORBIDDEN_SELECTOR)).toHaveLength(0);
	});

	it("offers no upload affordance and no field asking for a document", () => {
		const { container } = renderForm();

		// Positive control: textareas DO exist, so a zero here would be real.
		expect(container.querySelectorAll("textarea").length).toBeGreaterThan(0);
		expect(container.querySelectorAll('input[type="file"]')).toHaveLength(0);

		const labels = Array.from(container.querySelectorAll("label")).map(
			(label) => label.textContent ?? "",
		);
		expect(labels.length).toBeGreaterThan(20);
		for (const label of labels) {
			expect(label.toLowerCase()).not.toMatch(
				/ssn|social security|date of birth|driver|passport|routing|criminal|eviction|upload/,
			);
		}
	});
});

describe("RentalApplicationForm — the A-6 honeypot", () => {
	it("renders an off-screen, untabbable, aria-hidden trap named from the shared constant", () => {
		const { container } = renderForm();

		const honeypot = container.querySelector<HTMLInputElement>(
			"#apply-company-website",
		);
		expect(honeypot).not.toBeNull();
		if (honeypot === null) return;

		expect(honeypot.getAttribute("name")).toBe(HONEYPOT_FIELD);
		// Never type="hidden" — the single most detected honeypot pattern.
		expect(honeypot.getAttribute("type")).toBe("text");
		expect(honeypot.tabIndex).toBe(-1);
		expect(honeypot.getAttribute("style")).toBeNull();

		const wrapper = honeypot.closest("[aria-hidden='true']");
		expect(wrapper).not.toBeNull();
		if (wrapper === null) return;
		// Off-screen via classes, never an inline declaration (CLAUDE.md rule 5)
		// and never `display: none`, which some bots test for.
		expect(wrapper.getAttribute("style")).toBeNull();
		expect(wrapper.className).toContain("left-[-9999px]");
		expect(wrapper.className.split(/\s+/)).not.toContain("hidden");
	});

	it("keeps the trap out of the tab order while the real controls stay in it", () => {
		const { container } = renderForm();

		const tabbable = Array.from(
			container.querySelectorAll<HTMLElement>("input, textarea, button"),
		).filter((element) => element.tabIndex >= 0);

		// Positive control: the real controls are reachable.
		expect(tabbable.length).toBeGreaterThan(20);
		expect(
			tabbable.some((element) => element.id === "apply-company-website"),
		).toBe(false);
	});
});

describe("RentalApplicationForm — APPLY-06 placement (E-1's DOM-order half)", () => {
	it("puts the disclaimer section before the submit control, with no floating wrapper", () => {
		const { container } = renderForm();

		const heading = container.querySelector("#apply-disclaimer");
		expect(heading).not.toBeNull();
		const disclaimer = heading?.closest("section");
		expect(disclaimer).not.toBeNull();
		const submit = submitButton();
		if (disclaimer === null || disclaimer === undefined) return;

		expect(
			disclaimer.compareDocumentPosition(submit) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy();

		// UI-06: no pinned bar. A floating submit would let an applicant submit
		// without the disclaimer ever entering the viewport.
		for (
			let node: HTMLElement | null = submit;
			node !== null;
			node = node.parentElement
		) {
			const classes = node.className.split(/\s+/);
			expect(classes).not.toContain("fixed");
			expect(classes).not.toContain("sticky");
		}
	});

	it("attaches no acknowledgement control to the disclaimer block (UI-04)", () => {
		const { container } = renderForm();

		const disclaimer = container
			.querySelector("#apply-disclaimer")
			?.closest("section");
		expect(disclaimer).not.toBeNull();
		if (disclaimer === null || disclaimer === undefined) return;

		// Positive control: the disclaimer really did render its paragraphs, and
		// the page really does have exactly one checkbox — the attestation, which
		// lives OUTSIDE this section.
		expect(disclaimer.querySelectorAll("p").length).toBe(3);
		expect(screen.getAllByRole("checkbox")).toHaveLength(1);
		expect(
			disclaimer.querySelectorAll("input, [role='checkbox']"),
		).toHaveLength(0);
	});
});

describe("RentalApplicationForm — the UI-09 income layout (E-11's DOM-order half)", () => {
	it("renders the required source-neutral total before every employer field", () => {
		const { container } = renderForm();

		const labels = Array.from(container.querySelectorAll("label"));
		const byText = (text: string) =>
			labels.find((label) => label.textContent?.trim() === text);

		const total = byText("Gross monthly income from all sources");
		const employerLabels = [
			"Employer (optional)",
			"Job title (optional)",
			"Months at this employer (optional)",
		].map(byText);

		// Both halves must exist before the ordering claim means anything: an
		// ordering assertion over a missing label passes trivially.
		expect(total).toBeDefined();
		for (const employerLabel of employerLabels) {
			expect(employerLabel).toBeDefined();
		}
		if (total === undefined) return;

		for (const employerLabel of employerLabels) {
			if (employerLabel === undefined) continue;
			expect(
				total.compareDocumentPosition(employerLabel) &
					Node.DOCUMENT_POSITION_FOLLOWING,
			).toBeTruthy();
		}
	});

	it("gives the optional detail fields exactly one heading and no container of their own", () => {
		const { container } = renderForm();

		const section = container.querySelector("#apply-s3")?.closest("section");
		expect(section).not.toBeNull();
		if (section === null || section === undefined) return;

		const subHeadings = Array.from(section.querySelectorAll("h3"));
		expect(subHeadings).toHaveLength(1);
		expect(subHeadings[0]?.textContent).toBe(
			"Where your income comes from (optional)",
		);

		// Six inputs: the required total plus its five optional detail fields,
		// all in one group. The FIRST of them is the source-neutral total, which
		// is the ordering claim restated at the input level rather than the label
		// level. And the fair-housing note renders inside this section (E-12).
		const inputs = Array.from(section.querySelectorAll("input"));
		expect(inputs).toHaveLength(6);
		expect(inputs[0]?.getAttribute("name")).toBe("gross_monthly_income");
		expect(section.textContent).toContain(
			"This owner does not discriminate on the basis of race",
		);
	});
});

describe("RentalApplicationForm — the UI-10 household contract", () => {
	it("asks for a count and nothing else about who lives there", () => {
		const { container } = renderForm();

		const section = container.querySelector("#apply-s4")?.closest("section");
		expect(section).not.toBeNull();
		if (section === null || section === undefined) return;

		// Positive control: the count field and both optional textareas render.
		expect(section.querySelectorAll("input")).toHaveLength(1);
		expect(section.querySelectorAll("textarea")).toHaveLength(2);

		// No per-occupant sub-form, and no boolean pets control.
		expect(section.querySelectorAll("[role='checkbox'], select")).toHaveLength(
			0,
		);
		expect(section.textContent).toContain(
			"We do not ask for names, ages, or relationships",
		);
	});
});

/**
 * A-5 state 5. The applicant must always be able to ATTEMPT a submit and be told
 * what is missing.
 *
 * The bug this replaces: `canSubmit` in form-core 1.32 is
 * `(submissionAttempts === 0 && !isTouched && !hasOnMountError) || (!isValidating
 * && !isSubmitting && isValid)`, and the form-level validator reports every
 * unfilled required field, so `isValid` is false until all fourteen are correct.
 * The FIRST keystroke killed the left clause, and the button was then disabled
 * for the rest of the session — while each field shows its error only once
 * TOUCHED, and a form-level validator touches nothing. An applicant who scrolled
 * past one required field faced a dead grey control with no error anywhere.
 *
 * Every test below therefore asserts the RECOVERY PATH, not the gate: the click
 * lands, the offending field says so, and the summary counts it.
 */
describe("RentalApplicationForm — no unreachable submit (A-5 state 5)", () => {
	it("still lets an applicant attempt a submit with one required field never touched", async () => {
		const { container } = renderForm();
		// `phone` is skipped entirely — never typed in, never blurred, so its own
		// `isTouched` is false and it renders no error of its own.
		fillRequiredFields("phone");
		checkAttestation();

		// Positive control: the rest of the form really is filled, so the failure
		// below is about `phone` and not about an empty render.
		expect(control("email").value).toBe(APPLICANT_EMAIL);
		expect(control("phone").value).toBe("");
		expect(fieldErrors(container)).toEqual([]);

		// The control is reachable. This is the assertion the shipped build failed.
		expect(submitButton().disabled).toBe(false);
		fireEvent.click(submitButton());

		// And the attempt TELLS the applicant what is missing, in both places
		// A-5 state 5 requires: the field, and a summary above the button.
		expect(
			await screen.findByText("1 answer needs your attention"),
		).toBeInTheDocument();
		expect(fieldErrors(container).length).toBeGreaterThan(0);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("counts every missing answer, not just the first", async () => {
		renderForm();
		// Nothing filled at all: 13 text/number fields plus the attestation.
		fireEvent.click(submitButton());

		expect(
			await screen.findByText("14 answers need your attention"),
		).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("moves focus to the first invalid control in DOM order", async () => {
		renderForm();
		fillRequiredFields("current_city");
		checkAttestation();

		fireEvent.click(submitButton());
		await screen.findByText("1 answer needs your attention");

		expect(document.activeElement).toBe(control("current_city"));
	});

	it("clears the summary and submits once the missing answer is supplied", async () => {
		renderForm();
		fillRequiredFields("phone");
		checkAttestation();

		fireEvent.click(submitButton());
		await screen.findByText("1 answer needs your attention");

		fireEvent.change(control("phone"), { target: { value: "5125550143" } });
		fireEvent.click(submitButton());

		expect(await screen.findByText("Application received")).toBeInTheDocument();
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("keeps the UI-05 attestation genuinely required", async () => {
		// The gate did not go away — it moved from a disabled control to a stated
		// error. Without this the change above could have dropped the attestation.
		renderForm();
		fillRequiredFields();
		expect(screen.getByRole("checkbox")).toHaveAttribute(
			"data-state",
			"unchecked",
		);

		fireEvent.click(submitButton());
		expect(
			await screen.findByText("1 answer needs your attention"),
		).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();

		checkAttestation();
		fireEvent.click(submitButton());
		expect(await screen.findByText("Application received")).toBeInTheDocument();
	});
});

describe("RentalApplicationForm — the submitted envelope", () => {
	it("posts the honeypot and the idempotency key on the envelope, and only contract keys under `application`", async () => {
		renderForm();
		fillRequiredFields();
		checkAttestation();

		fireEvent.click(submitButton());
		await screen.findByText("Application received");

		expect(fetchMock).toHaveBeenCalledTimes(1);
		const body = lastRequestBody();
		expect(body.action).toBe("submit");
		expect(body.token).toBe("tok_live_abcdef");
		expect(body.submission_id).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
		);
		expect(typeof body.form_loaded_at).toBe("number");
		expect(body[HONEYPOT_FIELD]).toBe("");

		const application = body.application as Record<string, unknown>;
		// Positive control: the applicant's answers really are in there.
		expect(application.email).toBe(APPLICANT_EMAIL);
		expect(application.certified).toBe(true);
		// The trap is an ENVELOPE field; the strict validator rejects unknown keys.
		expect(HONEYPOT_FIELD in application).toBe(false);
		expect(Object.keys(application)).not.toContain("action");
	});

	/**
	 * THE TIMING STAMP IS THE SERVER'S CLOCK, ECHOED — NEVER THE DEVICE'S.
	 *
	 * `apply-token` drops a submission whose elapsed time reads implausible, and
	 * that drop answers HTTP 200 `success: true`: the applicant sees the
	 * confirmation screen, the form resets, no row is written and the owner is
	 * never told. When the stamp came from `Date.now()` in this component, elapsed
	 * was the real elapsed time PLUS the device's clock offset, so a phone running
	 * a minute fast failed every submission it would ever make, permanently and
	 * invisibly.
	 *
	 * The device clock is stubbed to a value 20 years away from the server's, so
	 * an implementation that reads it cannot coincidentally pass.
	 */
	it("posts the server-minted stamp, not this device's clock", async () => {
		const DEVICE_CLOCK = 2_000_000_000_000;
		vi.spyOn(Date, "now").mockReturnValue(DEVICE_CLOCK);

		renderForm(SERVER_ISSUED_AT);
		fillRequiredFields();
		checkAttestation();

		fireEvent.click(submitButton());
		await screen.findByText("Application received");

		expect(lastRequestBody().form_loaded_at).toBe(SERVER_ISSUED_AT);
		expect(lastRequestBody().form_loaded_at).not.toBe(DEVICE_CLOCK);
	});

	it("falls back to the device clock only when the function sent no stamp", async () => {
		// The deploy window, and nothing else: an `apply-token` older than the
		// change that mints `issued_at` sends none, and the pre-existing behaviour
		// is the only thing available. Once deployed this branch is unreachable.
		const DEVICE_CLOCK = 2_000_000_000_000;
		vi.spyOn(Date, "now").mockReturnValue(DEVICE_CLOCK);

		renderForm(null);
		fillRequiredFields();
		checkAttestation();

		fireEvent.click(submitButton());
		await screen.findByText("Application received");

		expect(lastRequestBody().form_loaded_at).toBe(DEVICE_CLOCK);
	});

	it("reuses one submission id across a retry so the RPC can deduplicate (T-66-20)", async () => {
		fetchMock.mockResolvedValueOnce(jsonResponse({}, 500));
		renderForm();
		fillRequiredFields();
		checkAttestation();

		fireEvent.click(submitButton());
		await screen.findByText("We could not submit your application");
		const first = lastRequestBody().submission_id;

		fetchMock.mockResolvedValueOnce(jsonResponse({ success: true }));
		fireEvent.click(submitButton());
		await screen.findByText("Application received");
		const second = lastRequestBody().submission_id;

		expect(fetchMock).toHaveBeenCalledTimes(2);
		expect(typeof first).toBe("string");
		expect(second).toBe(first);
	});
});

describe("RentalApplicationForm — a rate limit costs nothing typed (A-5 state 6)", () => {
	it("keeps every value and a live submit button on a 429", async () => {
		fetchMock.mockResolvedValue(jsonResponse({}, 429));
		renderForm();
		fillRequiredFields();
		checkAttestation();

		// Positive control before the failure, so the survival claim is about the
		// failure rather than about the field never having held anything.
		expect(control("email").value).toBe(APPLICANT_EMAIL);

		fireEvent.click(submitButton());
		await screen.findByText("This listing is busy right now");

		expect(control("email").value).toBe(APPLICANT_EMAIL);
		expect(control("first_name").value).toBe("Dana");
		expect(submitButton().disabled).toBe(false);
	});

	it("treats a capped reason at HTTP 200 the same way, without accusing the applicant", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ success: false, reason: "link_capped" }),
		);
		renderForm();
		fillRequiredFields();
		checkAttestation();

		fireEvent.click(submitButton());
		const alert = await screen.findByRole("alert");

		expect(alert.textContent).toContain("Nothing you typed has been lost");
		expect(alert.textContent?.toLowerCase()).not.toMatch(
			/too many|blocked|suspicious|abuse|limit/,
		);
		expect(control("email").value).toBe(APPLICANT_EMAIL);
		expect(submitButton().disabled).toBe(false);
	});

	it("reports a duplicate as success, because the row is already stored", async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ success: true, reason: "duplicate" }),
		);
		renderForm();
		fillRequiredFields();
		checkAttestation();

		fireEvent.click(submitButton());
		expect(await screen.findByText("Application received")).toBeInTheDocument();
	});
});

describe("RentalApplicationForm — nothing survives on the device", () => {
	it("holds none of the submitted answers after a success", async () => {
		const { container } = renderForm();
		fillRequiredFields();
		checkAttestation();

		// Positive control: the value WAS in the tree a moment ago.
		expect(container.textContent).toContain("About this application");
		expect(control("email").value).toBe(APPLICANT_EMAIL);

		fireEvent.click(submitButton());
		await screen.findByText("Application received");

		for (const input of Array.from(container.querySelectorAll("input"))) {
			expect(input.value).not.toBe(APPLICANT_EMAIL);
		}
		// Stronger than the input sweep: no recap, no "print your answers".
		expect(container.textContent).not.toContain(APPLICANT_EMAIL);
		expect(container.textContent).not.toContain("Dana");
	});

	it("writes nothing to device storage while the form is being filled and submitted", async () => {
		// This environment provides NO key/value stores at all, so spying on
		// `Storage.prototype` would be a spy that could never fire — a vacuous
		// assertion that survives the very mutation it exists to catch (proved:
		// a draft-writing mutation passed against exactly that version of this
		// test). Real, callable stubs are installed instead, so a draft written
		// to either store, or a database opened in the page, is observable.
		const probe = installStorageProbe();

		renderForm();
		fillRequiredFields();
		checkAttestation();

		fireEvent.click(submitButton());
		await screen.findByText("Application received");

		expect(probe.setItem).not.toHaveBeenCalled();
		expect(probe.openDatabase).not.toHaveBeenCalled();

		// Positive control: the stubs really are what a write would reach.
		globalThis.localStorage.setItem("probe", "1");
		globalThis.sessionStorage.setItem("probe", "2");
		globalThis.indexedDB.open("probe");
		expect(probe.setItem).toHaveBeenCalledTimes(2);
		expect(probe.openDatabase).toHaveBeenCalledTimes(1);
	});
});
