"use client";

import { FieldDescription, FieldGroup } from "#components/ui/field";
import { FAIR_HOUSING_NOTE } from "#lib/applications/application-copy";
import { withForm } from "#lib/forms/form-hook";
import { applicationFormOptions } from "./application-form-options";

/**
 * Section 3 of the public application form — UI-SPEC A-3, the F-3(a)
 * constrained section.
 *
 * THE LAYOUT IS THE COMPLIANCE CONTROL. Field ORDER is load-bearing here in a
 * way it is nowhere else in this form, so the rules below are binding and the
 * reasoning is recorded so the next editor does not "improve" them:
 *
 *   1. The ONLY required money field is the source-neutral total, and it comes
 *      FIRST. Requiring employment income as the primary signal is a
 *      source-of-income discrimination risk in CA, WA, NY and roughly twenty
 *      other jurisdictions, and 42 U.S.C. 3604(c) makes the application form
 *      itself a regulated surface. That makes this a LAYOUT constraint, not
 *      copy review.
 *   2. Employment gets NO separate container, heading, card, icon or visual
 *      precedence over the other-income fields. All five optional fields sit in
 *      the one group under the one sub-heading, at identical visual weight.
 *      Splitting "Employment" and "Other income" into two visually distinct
 *      groups is a blocking violation of the UI contract, not a preference.
 *   3. There is NO "type of income" picker. Enumerating income sources hands
 *      the owner a filter (F-3(a), explicit).
 *
 * Plan 66-17's E-11 asserts the same ordering against the rendered DOM, because
 * source order can be right while a CSS `order` or a grid placement inverts what
 * the applicant actually sees.
 */

/** Wired to the total-income input via aria-describedby, not just placed near it. */
const INCOME_HELP_ID = "apply-income-help";

export const ApplicationFieldsIncome = withForm({
	...applicationFormOptions,
	render: function ApplicationFieldsIncome({ form }) {
		return (
			<section aria-labelledby="apply-s3" className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					{/* A <span>, never a <p> — see the note in section 1 (D-3). */}
					<span className="typography-label">SECTION 3 OF 5</span>
					<h2 id="apply-s3" className="text-base font-semibold text-foreground">
						Income
					</h2>
				</div>

				<FieldGroup className="gap-5">
					{/* ORDER 1 and 2: the required, source-neutral total and its helper. */}
					<div className="flex flex-col gap-2">
						<form.AppField name="gross_monthly_income">
							{(field) => (
								<field.NumberField
									label="Gross monthly income from all sources"
									inputSize="lg"
									min={0}
									step="0.01"
									aria-describedby={INCOME_HELP_ID}
								/>
							)}
						</form.AppField>
						{/* mb-0: FieldDescription renders a <p>, and this one is a flex item
						    of the gap-2 column above, so the unscoped base
						    `p { margin-bottom: 1rem }` would be ADDED to the item's height
						    rather than collapsing out of it (D-3). The listed sources are
						    not a menu to pick from - they are there so an applicant on
						    benefits, a pension or child support enters that income in the
						    same box a salaried applicant uses. */}
						<FieldDescription id={INCOME_HELP_ID} className="mb-0 text-xs">
							Wages, self-employment, benefits, housing assistance, retirement,
							disability, child support, alimony, and any other regular lawful
							income all count the same.
						</FieldDescription>
					</div>

					{/* ORDER 3: the ONE sub-heading. A second heading here, or a bordered
					    container around any subset of the five fields below, is the
					    separated-Employment layout the contract forbids. */}
					<div className="flex flex-col gap-2">
						<h3 className="text-sm font-semibold text-foreground">
							Where your income comes from (optional)
						</h3>
						{/* mb-0: same gap-2 flex column as the line above (D-3). */}
						<FieldDescription className="mb-0 text-xs">
							All of these are optional. Leave anything blank that does not
							apply to you.
						</FieldDescription>
					</div>

					{/* ORDER 4 to 8: one group, identical weight, no sub-grouping. */}
					<form.AppField name="employer_name">
						{(field) => (
							<field.TextField
								label="Employer (optional)"
								inputSize="lg"
								autoComplete="organization"
							/>
						)}
					</form.AppField>

					<form.AppField name="employer_role">
						{(field) => (
							<field.TextField
								label="Job title (optional)"
								inputSize="lg"
								autoComplete="organization-title"
							/>
						)}
					</form.AppField>

					<form.AppField name="employer_months">
						{(field) => (
							<field.NumberField
								label="Months at this employer (optional)"
								inputSize="lg"
								min={0}
								step={1}
							/>
						)}
					</form.AppField>

					<form.AppField name="other_income_source">
						{(field) => (
							<field.TextField
								label="Other income source (optional)"
								inputSize="lg"
								autoComplete="off"
							/>
						)}
					</form.AppField>

					<form.AppField name="other_income_amount">
						{(field) => (
							<field.NumberField
								label="Other monthly amount (optional)"
								inputSize="lg"
								min={0}
								step="0.01"
							/>
						)}
					</form.AppField>
				</FieldGroup>

				{/* The owner's fair-housing statement, rendered inside this section and
				    read from the shared constant. LOCKED INVARIANT: it is template text
				    the owner can neither edit nor remove, because 42 U.S.C. 3604(c)
				    regulates the content of the form and an owner-editable
				    non-discrimination statement is one an owner could edit into a
				    violation. 66-17's E-12 asserts it renders inside this <section>.
				    mb-0: it is a flex item of the section's gap-4 column (D-3). */}
				<p
					role="note"
					className="mb-0 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground"
				>
					{FAIR_HOUSING_NOTE}
				</p>
			</section>
		);
	},
});
