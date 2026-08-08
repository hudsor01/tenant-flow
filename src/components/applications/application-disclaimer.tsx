"use client";

import { Checkbox } from "#components/ui/checkbox";
import { Field, FieldError, FieldLabel } from "#components/ui/field";
import { APPLY_DISCLAIMER } from "#lib/applications/application-copy";
import { withForm } from "#lib/forms/form-hook";
import { applicationFormOptions } from "./application-form-options";

/**
 * The APPLY-06 disclaimer block and the UI-05 attestation — UI-SPEC A-4.
 *
 * THE DISCLAIMER CARRIES NO ACKNOWLEDGEMENT, AND THAT IS THE POINT (UI-04).
 * The Fair Credit Reporting Act does not attach to TenantFlow at all: we obtain
 * no consumer reports and furnish none, so this block is a SCOPE STATEMENT, not
 * a consent. Putting a checkbox on it would tell the applicant they are
 * authorizing a screening — the exact opposite of what the text says — and
 * would manufacture a record of a consent nobody asked for. If a future editor
 * wants an acknowledgement here, the thing to change is this paragraph first.
 *
 * THE ATTESTATION IS A SEPARATE CONTROL WITH A SEPARATE MEANING. An accuracy
 * attestation is standard on paper rental applications, is meaningful to the
 * landlord, and is not screening-shaped. It is also a free server-side bot gate,
 * because the contract requires the literal `true`.
 *
 * The copy is READ from `application-copy.ts`, never retyped here. Every
 * sentence in it is load-bearing and the 66-02 test asserts each promise
 * individually, so a paraphrase in this file would silently weaken a claim that
 * still passes its own test.
 */

/** Shared so the form can focus this control when it is the first invalid one. */
export const APPLY_CERTIFY_ID = "apply-certify";

export function ApplicationDisclaimer() {
	return (
		<section
			aria-labelledby="apply-disclaimer"
			className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4"
		>
			<h2
				id="apply-disclaimer"
				className="text-base font-semibold text-foreground"
			>
				{APPLY_DISCLAIMER.heading}
			</h2>
			{APPLY_DISCLAIMER.paragraphs.map((paragraph) => (
				// 14px body, deliberately NOT 12px: this reads as a notice, not as
				// fine print, and it is the only bordered non-field block in the card
				// so it is already visually distinct without an accent.
				// mb-0: each <p> is a flex item of the gap-3 column above, so the
				// unscoped base `p { margin-bottom: 1rem }` would be added to the
				// item's height rather than collapsing out of it (D-3).
				<p key={paragraph} className="mb-0 text-sm text-muted-foreground">
					{paragraph}
				</p>
			))}
		</section>
	);
}

export const ApplicationAttestation = withForm({
	...applicationFormOptions,
	render: function ApplicationAttestation({ form }) {
		return (
			<form.Field name="certified">
				{(field) => (
					<div className="flex flex-col gap-2">
						{/* items-start, not the primitive's items-center: the label wraps
						    to two lines at the 311px field width 375px leaves, and the
						    shared Checkbox renders 44x44 rather than 16x16 under the
						    unlayered mobile block (D-1), so a centred 44px control against
						    a two-line label sits visibly low. */}
						<Field orientation="horizontal" className="items-start gap-3">
							<Checkbox
								id={APPLY_CERTIFY_ID}
								checked={field.state.value}
								onCheckedChange={(checked) =>
									field.handleChange(checked === true)
								}
								onBlur={field.handleBlur}
							/>
							{/* font-normal overrides Label's font-medium: this is a
							    sentence, not a field label. */}
							<FieldLabel
								htmlFor={APPLY_CERTIFY_ID}
								className="text-sm font-normal leading-snug"
							>
								I certify that the information I have provided is true and
								complete to the best of my knowledge.
							</FieldLabel>
						</Field>
						{/* The schema's message has to land somewhere. Without this the
						    only signal for an unchecked attestation is a submit button
						    that silently will not enable. */}
						<FieldError
							errors={field.state.meta.isTouched ? field.state.meta.errors : []}
						/>
					</div>
				)}
			</form.Field>
		);
	},
});
