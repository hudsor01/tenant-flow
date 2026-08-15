"use client";

import { FieldDescription, FieldGroup } from "#components/ui/field";
import { withForm } from "#lib/forms/form-hook";
import { applicationFormOptions } from "./application-form-options";

/**
 * Section 4 of the public application form — UI-SPEC A-3, the F-3(b)
 * constrained section.
 *
 * HOUSEHOLD IS A COUNT AND NOTHING ELSE. No names, no ages, no relationships,
 * and no per-person sub-form under any label whatsoever. Familial status is a
 * protected class under the Fair Housing Act, and per-person detail invites
 * exactly that inference on a surface 42 U.S.C. 3604(c) regulates directly
 * (D-05, F-3(b)). A sub-form here would be a blocking violation however it were
 * labelled, so the helper copy says out loud that the omission is a policy
 * rather than an oversight.
 *
 * NO BOOLEAN "DO YOU HAVE PETS?" CONTROL AND NO CONDITIONAL REVEAL. A required
 * yes/no adds a decision the applicant does not need to make, and a conditional
 * reveal adds render state to a form that deliberately has none. One optional
 * free-text field answers both cases.
 *
 * THE ASSISTANCE-ANIMAL LINE IS NOT DECORATION. An assistance animal is a
 * reasonable accommodation, not a pet, and asking about one is a disability
 * inquiry. The second helper line exists so an applicant is not led into
 * volunteering that information in a box labelled "pets".
 */

const OCCUPANTS_HELP_ID = "apply-occupants-help";
const PETS_HELP_ID = "apply-pets-help";
const PETS_ASSISTANCE_ID = "apply-pets-assistance";
const VEHICLES_HELP_ID = "apply-vehicles-help";

export const ApplicationFieldsHousehold = withForm({
	...applicationFormOptions,
	render: function ApplicationFieldsHousehold({ form }) {
		return (
			<section aria-labelledby="apply-s4" className="flex flex-col gap-4">
				<div className="flex flex-col gap-1">
					{/* A <span>, never a <p> — see the note in section 1 (D-3). */}
					<span className="typography-label">SECTION 4 OF 5</span>
					<h2 id="apply-s4" className="text-base font-semibold text-foreground">
						Household
					</h2>
				</div>

				<FieldGroup className="gap-5">
					<div className="flex flex-col gap-2">
						<form.AppField name="occupant_count">
							{(field) => (
								<field.NumberField
									label="Number of people who will live in the unit"
									inputSize="lg"
									min={1}
									step={1}
									aria-describedby={OCCUPANTS_HELP_ID}
								/>
							)}
						</form.AppField>
						{/* mb-0: FieldDescription is a <p> and a flex item of the gap-2
						    column above, so the unscoped base bottom margin would be added
						    to the item's height rather than collapsing out (D-3). */}
						<FieldDescription id={OCCUPANTS_HELP_ID} className="mb-0 text-xs">
							Count everyone who will live here, including yourself. We do not
							ask for names, ages, or relationships.
						</FieldDescription>
					</div>

					<div className="flex flex-col gap-2">
						{/* The layered important min-height override on the next line is the
						    only declaration that beats the unlayered mobile block's
						    `min-height: 2.75rem` on a textarea (D-1). Without it an empty
						    textarea renders 44px tall at 375px and reads as a single-line
						    text input. The trailing-`!` is Tailwind v4 important syntax and
						    is new to this repo. */}
						<form.AppField name="pet_details">
							{(field) => (
								<field.TextareaField
									label="Pets (optional)"
									className="min-h-24!"
									autoComplete="off"
									aria-describedby={`${PETS_HELP_ID} ${PETS_ASSISTANCE_ID}`}
								/>
							)}
						</form.AppField>
						{/* mb-0: same gap-2 flex column (D-3). */}
						<FieldDescription id={PETS_HELP_ID} className="mb-0 text-xs">
							Type, number, and approximate weight. Leave blank if none.
						</FieldDescription>
						{/* mb-0: same gap-2 flex column (D-3). */}
						<FieldDescription id={PETS_ASSISTANCE_ID} className="mb-0 text-xs">
							Assistance animals are not pets and are not subject to pet
							policies. You do not need to disclose one here.
						</FieldDescription>
					</div>

					<div className="flex flex-col gap-2">
						{/* Same layered important min-height override, same D-1 reason as
						    the pets textarea above: the unlayered mobile block would
						    otherwise floor this control at 44px. */}
						<form.AppField name="vehicle_details">
							{(field) => (
								<field.TextareaField
									label="Vehicles (optional)"
									className="min-h-24!"
									autoComplete="off"
									aria-describedby={VEHICLES_HELP_ID}
								/>
							)}
						</form.AppField>
						{/* mb-0: same gap-2 flex column (D-3). */}
						<FieldDescription id={VEHICLES_HELP_ID} className="mb-0 text-xs">
							Make, model, and license plate for each vehicle you will park
							here. Leave blank if none.
						</FieldDescription>
					</div>
				</FieldGroup>
			</section>
		);
	},
});
