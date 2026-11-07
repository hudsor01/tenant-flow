/**
 * The utilities a lease can include in rent or leave to the tenant: the
 * details step offers them, and the review step names them with the same
 * labels.
 */
export const UTILITY_OPTIONS = [
	{ value: "electricity", label: "Electricity" },
	{ value: "gas", label: "Gas" },
	{ value: "water", label: "Water" },
	{ value: "sewer", label: "Sewer" },
	{ value: "trash", label: "Trash" },
	{ value: "internet", label: "Internet" },
	{ value: "cable", label: "Cable" },
	{ value: "lawn_care", label: "Lawn Care" },
	{ value: "pest_control", label: "Pest Control" },
	{ value: "hoa_fees", label: "HOA Fees" },
] as const;

const UTILITY_LABELS: ReadonlyMap<string, string> = new Map(
	UTILITY_OPTIONS.map((u) => [u.value, u.label]),
);

/** A stored utility as its label; a value outside the list as written. */
export function utilityLabel(value: string): string {
	return UTILITY_LABELS.get(value) ?? value;
}
