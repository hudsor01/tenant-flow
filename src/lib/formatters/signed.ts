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

/**
 * A figure to `fractionDigits` decimals as `toFixed` writes it, with a
 * negative that rounds to zero written unsigned: "-0.0" is "0.0". The report
 * CSVs' number cells (`csvNumber`) are written through it, and a page that
 * shows the same figure prints it through it too, so the page reads what its
 * export holds.
 */
export function formatFixed(value: number, fractionDigits: number): string {
	const text = value.toFixed(fractionDigits);
	return text.startsWith("-") && Number(text) === 0 ? text.slice(1) : text;
}
