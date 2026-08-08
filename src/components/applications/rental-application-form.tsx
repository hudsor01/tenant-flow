"use client";

import { useStore } from "@tanstack/react-form";
import { useRef, useState } from "react";
import { useUnsavedChangesWarning } from "#hooks/use-unsaved-changes";
import { useAppForm, withForm } from "#lib/forms/form-hook";
import { HONEYPOT_FIELD } from "../../../supabase/functions/_shared/application-guards";
import {
	APPLY_CERTIFY_ID,
	ApplicationAttestation,
	ApplicationDisclaimer,
} from "./application-disclaimer";
import { ApplicationFieldsAbout } from "./application-fields-about";
import { ApplicationFieldsAddress } from "./application-fields-address";
import { ApplicationFieldsHousehold } from "./application-fields-household";
import { ApplicationFieldsIncome } from "./application-fields-income";
import { ApplicationFieldsReferences } from "./application-fields-references";
import {
	type ApplicationFormValues,
	applicationFormOptions,
	applicationSubmissionSchema,
	validateApplicationForm,
} from "./application-form-options";
import {
	ApplicationConfirmation,
	type SubmitNotice,
	SubmitNoticeAlert,
} from "./application-outcome";

/**
 * The public applicant form — UI-SPEC A-2 through A-7, plan 66-12.
 *
 * NOTHING THE APPLICANT TYPES IS EVER WRITTEN TO THE DEVICE. No draft, no
 * autosave, no key/value cache, no in-page database, no cookie. This is a LOCKED
 * INVARIANT and not an unfinished optimisation: this page is opened from a
 * public listing, which means it is regularly opened on a library terminal or a
 * shared household phone, and leaving a name, email, phone, home address and
 * income behind on that device is a materially worse outcome than losing a form.
 * The same reasoning is why a successful submit RESETS the form: a Back
 * navigation must not restore that data, and nothing here offers to copy, print
 * or download what was submitted. The natural instinct on a 26-field form is a
 * draft; the answer is no.
 *
 * ONE SCROLL, NOT A STEPPER (UI-01). There is no account and D-10 forbids
 * emailing the applicant anything, so there is no resume link and no draft:
 * every navigation before the single commit point is another chance to lose 26
 * fields with no recovery path. The Edge Function's validator is authoritative
 * and its errors are keyed to fields, which a stepper cannot show while another
 * step is mounted. And mobile autofill fills name, email, phone and address in
 * one pass only when they share a document.
 *
 * THE FORM-LEVEL VALIDATOR IS `onChange`, NEVER `onBlur`. A form-level `onBlur`
 * validator deadlocks `canSubmit` against `SubmitButton`: the schema validates
 * every field on any blur, so the button disables itself on the very blur its
 * own click causes and the click never lands, with no error anywhere. See the
 * note in `submit-button.tsx`.
 *
 * THE SUBMIT CONTROL SITS IN NORMAL FLOW, DIRECTLY BELOW THE DISCLAIMER
 * (UI-06). A floating bar would let an applicant submit without the APPLY-06
 * disclaimer ever entering the viewport, which defeats the requirement and
 * falsifies plan 66-17's E-1.
 */

/** The RPC answers 200 for a capped submission; the limiter answers 429. */
const CAPPED_REASONS: ReadonlySet<string> = new Set([
	"rate_capped",
	"link_capped",
]);

interface RentalApplicationFormProps {
	token: string;
	propertyLabel: string | null;
	unitLabel: string | null;
}

type SubmitOutcome = "ok" | "capped" | "failed";

async function postApplication(
	body: Record<string, unknown>,
): Promise<SubmitOutcome> {
	const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const response = await fetch(`${baseUrl}/functions/v1/apply-token`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (response.status === 429) return "capped";
	const data = (await response.json().catch(() => ({}))) as {
		success?: boolean;
		reason?: string;
	};
	// The RPC's `duplicate` branch already arrives as success — the row is
	// stored, and telling the applicant otherwise would make them submit again.
	if (data.success === true) return "ok";
	if (typeof data.reason === "string" && CAPPED_REASONS.has(data.reason)) {
		return "capped";
	}
	return "failed";
}

type SubmitResult =
	| { kind: "ok" }
	| { kind: "invalid"; fields: ReadonlySet<string> }
	| { kind: "capped" }
	| { kind: "failed" };

/**
 * The whole submit path, kept out of the component so the render function stays
 * readable. The schema's parsed OUTPUT is what goes on the wire — the trimming,
 * the lowercased email and the uppercased state code are the schema's job, not
 * this call's.
 */
async function submitApplication(context: {
	token: string;
	submissionId: string;
	mountedAt: number;
	values: ApplicationFormValues;
}): Promise<SubmitResult> {
	const parsed = applicationSubmissionSchema.safeParse(context.values);
	if (!parsed.success) {
		return {
			kind: "invalid",
			fields: new Set(
				parsed.error.issues.map((issue) => String(issue.path[0] ?? "")),
			),
		};
	}
	const outcome = await postApplication({
		action: "submit",
		token: context.token,
		submission_id: context.submissionId,
		form_loaded_at: context.mountedAt,
		// Lifted to the ENVELOPE: the strict validator rejects unknown keys, so a
		// trap field left inside `application` would fail every single submit.
		[HONEYPOT_FIELD]: context.values[HONEYPOT_FIELD],
		application: parsed.data,
	});
	return { kind: outcome };
}

/** A-5 state 5: focus lands on the first invalid control in DOM order. */
function focusFirstInvalid(
	root: HTMLFormElement | null,
	invalid: ReadonlySet<string>,
): void {
	if (root === null) return;
	const controls = root.querySelectorAll<HTMLElement>(
		'input, textarea, [role="checkbox"]',
	);
	for (const control of controls) {
		const name =
			control.getAttribute("name") ??
			(control.id === APPLY_CERTIFY_ID ? "certified" : "");
		if (invalid.has(name)) {
			control.focus();
			return;
		}
	}
}

/**
 * A-6. Off-screen with Tailwind classes and no inline declaration (CLAUDE.md
 * rule 5). Deliberately NOT `display: none` and never `type="hidden"` — both
 * are the patterns bots check for. The negative tabIndex is what keeps
 * `aria-hidden` axe-clean AND what stops a keyboard user from ever reaching
 * this control. The wire name is imported from the constant the Edge Function
 * reads it from, never retyped.
 */
const ApplicationHoneypot = withForm({
	...applicationFormOptions,
	render: function ApplicationHoneypot({ form }) {
		return (
			<form.Field name={HONEYPOT_FIELD}>
				{(field) => (
					<div
						aria-hidden="true"
						className="absolute top-auto left-[-9999px] h-px w-px overflow-hidden"
					>
						<label htmlFor="apply-company-website">Company website</label>
						<input
							id="apply-company-website"
							name={field.name}
							type="text"
							tabIndex={-1}
							autoComplete="off"
							value={field.state.value}
							onChange={(event) => field.handleChange(event.target.value)}
						/>
					</div>
				)}
			</form.Field>
		);
	},
});

export function RentalApplicationForm({
	token,
	propertyLabel,
	unitLabel,
}: RentalApplicationFormProps) {
	// Both minted ONCE per mount, via lazy initializers rather than a value
	// recomputed on every render. The submission id is what makes a double-click
	// or a network retry the same submission at the RPC's `on conflict do
	// nothing`; regenerating it per attempt would defeat that, while a page
	// refresh correctly mints a new one so a genuine re-application still works.
	const [submissionId] = useState(() => crypto.randomUUID());
	const [mountedAt] = useState(() => Date.now());
	const [notice, setNotice] = useState<SubmitNotice | null>(null);
	const [confirmed, setConfirmed] = useState(false);
	const formRef = useRef<HTMLFormElement>(null);

	const form = useAppForm({
		...applicationFormOptions,
		// onChange, never onBlur — see the header note. The validator itself lives
		// in application-form-options.ts; this file states no rule of its own.
		validators: { onChange: ({ value }) => validateApplicationForm(value) },
		onSubmit: async ({ value, formApi }) => {
			setNotice(null);
			const result = await submitApplication({
				token,
				submissionId,
				mountedAt,
				values: value,
			});
			if (result.kind === "invalid") {
				setNotice({ kind: "invalid", count: result.fields.size });
				focusFirstInvalid(formRef.current, result.fields);
				return;
			}
			if (result.kind === "ok") {
				// The form is cleared BEFORE the confirmation mounts, so a Back
				// navigation cannot restore applicant PII on a shared device.
				formApi.reset();
				setConfirmed(true);
				return;
			}
			setNotice({ kind: result.kind });
		},
	});

	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
	const isDirty = useStore(form.store, (state) => state.isDirty);
	// The closest thing to a safety net that exists without writing applicant PII
	// to a possibly-shared device.
	useUnsavedChangesWarning(isDirty && !confirmed);

	if (confirmed) {
		return (
			<ApplicationConfirmation
				propertyLabel={propertyLabel}
				unitLabel={unitLabel}
			/>
		);
	}

	return (
		<form
			ref={formRef}
			// noValidate: the browser's own bubbles would pre-empt the schema's
			// messages and land nowhere useful on a 26-field scroll.
			noValidate
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
			className="flex flex-col gap-8"
		>
			{/* A-5 state 3. display:contents so it changes nothing about layout while
			    making every control below unusable mid-flight. */}
			<fieldset disabled={isSubmitting} className="contents">
				<ApplicationFieldsAbout form={form} />
				<ApplicationFieldsAddress form={form} />
				<ApplicationFieldsIncome form={form} />
				<ApplicationFieldsHousehold form={form} />
				<ApplicationFieldsReferences form={form} />

				<div className="flex flex-col gap-4">
					<ApplicationDisclaimer />
					<ApplicationAttestation form={form} />

					<ApplicationHoneypot form={form} />

					{notice === null ? null : <SubmitNoticeAlert notice={notice} />}

					<form.AppForm>
						<form.SubmitButton
							label="Submit application"
							submittingLabel="Submitting..."
							className="w-full"
						/>
					</form.AppForm>
				</div>
			</fieldset>
		</form>
	);
}
