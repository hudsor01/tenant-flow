"use client";

import { FieldGroup } from "#components/ui/field";
import { withForm } from "#lib/forms/form-hook";
import { applicationFormOptions } from "./application-form-options";

/**
 * Section 2 of the public application form — UI-SPEC A-3.
 *
 * THE STATE FIELD IS A TWO-CHARACTER TEXT INPUT, NOT A DROPDOWN (UI-03). Two
 * reasons, both concrete. A 51-item radix listbox at 375px is worse than the
 * native `address-level1` autofill path the browser already runs for a text
 * input. And `SelectTrigger` carries `data-[size=default]:h-11` at specificity
 * (0,2,0), which blocks the plain `h-12` this page needs everywhere else, so a
 * dropdown would have to win a fight with `!` that the text input never starts.
 * The VALUE is still validated against the existing `USState` union by
 * `rentalApplicationSchema`; there is no second list of states anywhere.
 *
 * Every input is `inputSize="lg"` for the D-1 reason recorded in
 * `application-fields-about.tsx`.
 */
export const ApplicationFieldsAddress = withForm({
	...applicationFormOptions,
	render: function ApplicationFieldsAddress({ form }) {
		return (
			<section aria-labelledby="apply-s2" className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					{/* A <span>, never a <p> — see the note in section 1 (D-3). */}
					<span className="typography-label">SECTION 2 OF 5</span>
					<h2 id="apply-s2" className="text-base font-semibold text-foreground">
						Where you live now
					</h2>
				</div>

				<FieldGroup className="gap-5">
					<form.AppField name="current_street">
						{(field) => (
							<field.TextField
								label="Street address"
								inputSize="lg"
								autoComplete="address-line1"
							/>
						)}
					</form.AppField>

					{/* Single column below 640px without exception (A-3). City takes two
					    of the four columns at sm and above so state and ZIP each get one. */}
					<div className="grid gap-4 sm:grid-cols-4">
						{/* The span sits on a wrapper, not on the field: TextField forwards
						    className to the <input>, so a col-span there would size the
						    control instead of the grid cell. */}
						<div className="sm:col-span-2">
							<form.AppField name="current_city">
								{(field) => (
									<field.TextField
										label="City"
										inputSize="lg"
										autoComplete="address-level2"
									/>
								)}
							</form.AppField>
						</div>

						<form.AppField name="current_state">
							{(field) => (
								<field.TextField
									label="State"
									inputSize="lg"
									maxLength={2}
									autoCapitalize="characters"
									autoComplete="address-level1"
								/>
							)}
						</form.AppField>

						<form.AppField name="current_postal_code">
							{(field) => (
								<field.TextField
									label="ZIP"
									inputSize="lg"
									inputMode="numeric"
									maxLength={10}
									autoComplete="postal-code"
								/>
							)}
						</form.AppField>
					</div>

					{/* autoComplete="off" on both landlord fields: the browser's `name`
					    and `tel` heuristics would offer the APPLICANT's own details for a
					    field asking about somebody else, which is worse than no help. */}
					<form.AppField name="current_landlord_name">
						{(field) => (
							<field.TextField
								label="Current landlord name (optional)"
								inputSize="lg"
								autoComplete="off"
							/>
						)}
					</form.AppField>

					<form.AppField name="current_landlord_phone">
						{(field) => (
							<field.TextField
								label="Current landlord phone (optional)"
								inputSize="lg"
								type="tel"
								autoComplete="off"
							/>
						)}
					</form.AppField>

					{/* min-h-24! is a LAYERED !important, and it is the only thing that
					    beats the unlayered mobile block's `min-height: 2.75rem` on a
					    textarea (D-1). Without it an empty textarea renders 44px tall at
					    375px and reads as a single-line text input. The trailing-`!` is
					    Tailwind v4's important syntax and is new to this repo. */}
					<form.AppField name="reason_for_moving">
						{(field) => (
							<field.TextareaField
								label="Reason for moving (optional)"
								className="min-h-24!"
								autoComplete="off"
							/>
						)}
					</form.AppField>
				</FieldGroup>
			</section>
		);
	},
});
