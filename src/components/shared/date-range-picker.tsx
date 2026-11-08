"use client";

import { CalendarIcon, X } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "#components/ui/button";
import { Calendar } from "#components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "#components/ui/popover";
import { useMediaQuery } from "#hooks/use-media-query";
import { cn } from "#lib/utils";

/**
 * Where the calendar lays two months side by side: its months row is
 * `flex-col md:flex-row`, so below Tailwind's `md` (48rem) a second month
 * stacks under the first. Stacked, the two months stood 777.5px tall in the
 * 444px above the trigger at 390x844 and pushed the month navigation and the
 * first weeks off screen (66.2-39 fix round 4, Part 5d), so the picker shows
 * one month there.
 */
const TWO_MONTHS_QUERY = "(width >= 48rem)";

export interface DateRangePickerProps {
	value: { from: Date | undefined; to: Date | undefined };
	onChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
	placeholder?: string;
	"aria-label"?: string;
	className?: string;
}

function formatDate(d: Date): string {
	return d.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

export function DateRangePicker({
	value,
	onChange,
	placeholder = "Pick a date range",
	"aria-label": ariaLabel = "Filter by date range",
	className,
}: DateRangePickerProps) {
	const [open, setOpen] = useState(false);
	const twoMonths = useMediaQuery(TWO_MONTHS_QUERY);
	const hasRange = value.from !== undefined || value.to !== undefined;

	const label = (() => {
		if (value.from && value.to) {
			return `${formatDate(value.from)} – ${formatDate(value.to)}`;
		}
		if (value.from) return `From ${formatDate(value.from)}`;
		if (value.to) return `Until ${formatDate(value.to)}`;
		return placeholder;
	})();

	return (
		<div className={cn("flex items-center gap-1", className)}>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						size="sm"
						className={cn(
							"flex-1 justify-start text-left font-normal",
							!hasRange && "text-muted-foreground",
						)}
						// The name starts with the range the trigger shows, then says what
						// it filters (WCAG 2.5.3 label in name).
						aria-label={`${label} (${ariaLabel})`}
					>
						<CalendarIcon className="mr-2 size-4 shrink-0" aria-hidden="true" />
						<span className="truncate">{label}</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<Calendar
						mode="range"
						selected={value as DateRange | undefined}
						onSelect={(range) => {
							onChange({
								from: range?.from,
								to: range?.to,
							});
						}}
						numberOfMonths={twoMonths ? 2 : 1}
					/>
				</PopoverContent>
			</Popover>
			{hasRange && (
				<Button
					variant="ghost"
					size="sm"
					className="size-9 p-0"
					onClick={() => onChange({ from: undefined, to: undefined })}
					aria-label="Clear date range"
				>
					<X className="size-4" aria-hidden="true" />
				</Button>
			)}
		</div>
	);
}
