/** The U+2212 typographic minus the trend figures use (not hyphen-minus). */
export const TYPOGRAPHIC_MINUS = String.fromCharCode(0x2212);

/**
 * A signed figure to one decimal, as the analytics overview's change lines and
 * the dashboard's occupancy chip print a change: "+1.5", "−25.0", "0.0".
 */
export function formatSignedOneDecimal(value: number): string {
	const rounded = Math.round(value * 10) / 10;
	const sign = rounded > 0 ? "+" : rounded < 0 ? TYPOGRAPHIC_MINUS : "";
	return `${sign}${Math.abs(rounded).toFixed(1)}`;
}
