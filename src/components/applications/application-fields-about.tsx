"use client";

import { FieldGroup } from "#components/ui/field";
import { withForm } from "#lib/forms/form-hook";
import { applicationFormOptions } from "./application-form-options";

/**
 * Section 1 of the public application form — UI-SPEC A-3.
 *
 * EVERY INPUT IS `inputSize="lg"`, AND THAT IS NOT A STYLE PREFERENCE (D-1).
 * `src/app/globals.css` opens an UNLAYERED `@media (max-width: 768px)` block at
 * brace depth 0 which forces `padding: clamp(.75rem, 2vw, 1rem)` and
 * `min-height: 2.75rem` onto every `input`. Unlayered normal declarations
 * outrank every layered Tailwind utility at any specificity, so at 375px the
 * default `h-11` leaves a 44 - 24 - 2 = 18px content box for a 16px font.
 * `lg` (48px) restores the headroom. Plan 66-17's E-2 asserts a rendered height
 * of exactly 48px on every input on this page.
 *
 * NO ASTERISKS ON REQUIRED FIELDS. Required is the default here and optional is
 * the marked case — less visual noise on a 26-field form, and more honest.
 */
export const ApplicationFieldsAbout = withForm({
	...applicationFormOptions,
	render: function ApplicationFieldsAbout({ form }) {
		return (
			<section aria-labelledby="apply-s1" className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					{/* A <span>, never a <p>: the unscoped base rule gives every <p> a
					    1rem bottom margin, and inside a flex column that margin is added
					    to the item's height instead of collapsing out (D-3). A span
					    carries no base margin at all, so there is nothing to neutralize. */}
					<span className="typography-label">SECTION 1 OF 5</span>
					<h2 id="apply-s1" className="text-base font-semibold text-foreground">
						About you
					</h2>
				</div>

				{/* gap-5 (20px) overrides FieldGroup's gap-7 default: a measured density
				    decision for a 26-field public form, still a multiple of 4. */}
				<FieldGroup className="gap-5">
					{/* Paired below 640px means stacked, without exception (A-3). */}
					<div className="grid gap-4 sm:grid-cols-2">
						<form.AppField name="first_name">
							{(field) => (
								<field.TextField
									label="First name"
									inputSize="lg"
									autoComplete="given-name"
									// CLAUDE.md: autoFocus on the primary input of key forms.
									// This is the first control of the only form on the page.
									autoFocus
								/>
							)}
						</form.AppField>

						<form.AppField name="last_name">
							{(field) => (
								<field.TextField
									label="Last name"
									inputSize="lg"
									autoComplete="family-name"
								/>
							)}
						</form.AppField>
					</div>

					<form.AppField name="email">
						{(field) => (
							<field.TextField
								label="Email"
								inputSize="lg"
								type="email"
								inputMode="email"
								autoComplete="email"
							/>
						)}
					</form.AppField>

					<form.AppField name="phone">
						{(field) => (
							<field.TextField
								label="Phone"
								inputSize="lg"
								type="tel"
								inputMode="tel"
								autoComplete="tel"
							/>
						)}
					</form.AppField>

					{/* Native <input type="date">. No calendar popover and no Select
					    anywhere on this page (UI-03): the mobile date picker is the one
					    the applicant's own OS already knows how to drive. */}
					<form.AppField name="desired_move_in_date">
						{(field) => (
							<field.DateField label="Desired move-in date" inputSize="lg" />
						)}
					</form.AppField>
				</FieldGroup>
			</section>
		);
	},
});
