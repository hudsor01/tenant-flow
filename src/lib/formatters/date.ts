import { differenceInCalendarDays } from "date-fns";

export type DateInput = string | number | Date | null | undefined;

export interface FormatDateOptions {
	locale?: string;
	style?: "short" | "long";
	relative?: boolean;
	relativeThresholdDays?: number;
	relativeTo?: Date;
	formatOptions?: Intl.DateTimeFormatOptions;
	fallback?: string;
}

const toDate = (value: DateInput): Date | null => {
	if (value === null || value === undefined) return null;
	if (value instanceof Date) {
		return isNaN(value.getTime()) ? null : value;
	}

	if (typeof value === "number") {
		const ms = value < 1_000_000_000_000 ? value * 1000 : value;
		const date = new Date(ms);
		return isNaN(date.getTime()) ? null : date;
	}

	const normalized =
		typeof value === "string" && !value.includes("T")
			? `${value}T00:00:00Z`
			: value;

	const date = new Date(normalized);
	return isNaN(date.getTime()) ? null : date;
};

const formatWithIntl = (
	date: Date,
	locale: string,
	style: "short" | "long",
	formatOptions?: Intl.DateTimeFormatOptions,
): string => {
	const options =
		formatOptions ??
		(style === "long"
			? { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }
			: { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

	return new Intl.DateTimeFormat(locale, options).format(date);
};

export const formatDate = (
	value: DateInput,
	{
		locale = "en-US",
		style = "short",
		relative = false,
		relativeThresholdDays = 7,
		relativeTo = new Date(),
		formatOptions,
		fallback,
	}: FormatDateOptions = {},
): string => {
	const date = toDate(value);
	if (!date) return fallback ?? "";

	if (relative) {
		const diffMs = date.getTime() - relativeTo.getTime();
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
		const absDays = Math.abs(diffDays);

		if (absDays === 0) return "Today";
		if (absDays === 1) return diffDays > 0 ? "Tomorrow" : "Yesterday";
		if (absDays < relativeThresholdDays) {
			return diffDays > 0 ? `In ${absDays} days` : `${absDays} days ago`;
		}
	}

	return formatWithIntl(date, locale, style, formatOptions);
};

// Parse a YYYY-MM-DD string into a local-zone Date (midnight local).
// Returns undefined on malformed input. Critically uses local-component
// construction — NOT `new Date('2026-04-30')` which produces UTC midnight
// and silently shifts the value by one day for users east of UTC.
// Round-trips through getFullYear/getMonth/getDate to reject overflow
// inputs like `2026-13-99` (which JS otherwise wraps to April 9, 2027).
export function parseLocalYmd(input: string | null): Date | undefined {
	if (!input) return undefined;
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
	if (!m) return undefined;
	const y = Number(m[1]);
	const mo = Number(m[2]);
	const day = Number(m[3]);
	const d = new Date(y, mo - 1, day);
	if (Number.isNaN(d.getTime())) return undefined;
	if (d.getFullYear() !== y || d.getMonth() !== mo - 1 || d.getDate() !== day) {
		return undefined;
	}
	return d;
}

// Format a Date as local-zone YYYY-MM-DD. Pairs with parseLocalYmd for
// round-trip stability across timezones.
export function formatLocalYmd(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}

export const formatRelativeDate = (
	value: DateInput,
	{
		baseDate = new Date(),
		addSuffix = true,
	}: { baseDate?: Date; addSuffix?: boolean } = {},
): string => {
	const date = toDate(value);
	if (!date) return "";
	const dayDiff = differenceInCalendarDays(baseDate, date);
	const absDays = Math.abs(dayDiff);

	if (absDays === 0) return "Today";

	// Calendar-day distance verbatim: yesterday is "1 day ago", never "2 days
	// ago" (the historical +1 overstated every past event's age by one day).
	const unit = absDays === 1 ? "day" : "days";

	if (!addSuffix) return `${absDays} ${unit}`;
	return dayDiff > 0 ? `${absDays} ${unit} ago` : `In ${absDays} ${unit}`;
};

export const getOrdinalSuffix = (day: number): string => {
	if (day >= 11 && day <= 13) return "th";
	switch (day % 10) {
		case 1:
			return "st";
		case 2:
			return "nd";
		case 3:
			return "rd";
		default:
			return "th";
	}
};

export const formatDateRange = (
	start: DateInput,
	end: DateInput,
	options: FormatDateOptions = {},
): string => {
	const startDate = toDate(start);
	const endDate = toDate(end);

	if (!startDate && !endDate) return options.fallback ?? "";
	if (startDate && !endDate) return formatDate(startDate, options);
	if (!startDate && endDate) return formatDate(endDate, options);

	return `${formatDate(startDate, options)} - ${formatDate(endDate, options)}`;
};
