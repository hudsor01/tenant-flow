"use client";

import { FieldGroup } from "#components/ui/field";
import { withForm } from "#lib/forms/form-hook";
import { applicationFormOptions } from "./application-form-options";

/**
 * Section 5 of the public application form — UI-SPEC A-3.
 *
 * THE UI DOES NOT RE-IMPLEMENT THE PAIRING RULE. All three second-reference
 * fields are optional, and filling any one of them requires a name and a phone;
 * that rule lives once, in `rentalApplicationSchema` (plan 66-02), and again on
 * the authoritative server side in `parseSubmissionPayload`. This file renders
 * the resulting `FieldError` and states the rule nowhere.
 *
 * The second reference is a `role="group"` labelled by its own heading rather
 * than three relabelled fields. Screen-reader users otherwise hear "Reference
 * name" twice with nothing to tell the two apart, and relabelling them would
 * diverge from the copy contract.
 */
export const ApplicationFieldsReferences = withForm({
	...applicationFormOptions,
	render: function ApplicationFieldsReferences({ form }) {
		return (
			<section aria-labelledby="apply-s5" className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					{/* A <span>, never a <p> — see the note in section 1 (D-3). */}
					<span className="typography-label">SECTION 5 OF 5</span>
					<h2 id="apply-s5" className="text-base font-semibold text-foreground">
						References
					</h2>
				</div>

				<FieldGroup className="gap-5">
					<form.AppField name="reference_1_name">
						{(field) => (
							<field.TextField
								label="Reference name"
								inputSize="lg"
								autoComplete="off"
							/>
						)}
					</form.AppField>

					<form.AppField name="reference_1_relationship">
						{(field) => (
							<field.TextField
								label="Relationship to you (optional)"
								inputSize="lg"
								autoComplete="off"
							/>
						)}
					</form.AppField>

					<form.AppField name="reference_1_phone">
						{(field) => (
							<field.TextField
								label="Reference phone"
								inputSize="lg"
								type="tel"
								autoComplete="off"
							/>
						)}
					</form.AppField>

					<div
						role="group"
						aria-labelledby="apply-reference-2"
						className="flex flex-col gap-5"
					>
						<h3
							id="apply-reference-2"
							className="text-sm font-semibold text-foreground"
						>
							Second reference (optional)
						</h3>

						<form.AppField name="reference_2_name">
							{(field) => (
								<field.TextField
									label="Reference name (optional)"
									inputSize="lg"
									autoComplete="off"
								/>
							)}
						</form.AppField>

						<form.AppField name="reference_2_relationship">
							{(field) => (
								<field.TextField
									label="Relationship to you (optional)"
									inputSize="lg"
									autoComplete="off"
								/>
							)}
						</form.AppField>

						<form.AppField name="reference_2_phone">
							{(field) => (
								<field.TextField
									label="Reference phone (optional)"
									inputSize="lg"
									type="tel"
									autoComplete="off"
								/>
							)}
						</form.AppField>
					</div>
				</FieldGroup>
			</section>
		);
	},
});
