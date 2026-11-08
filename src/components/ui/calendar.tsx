"use client";

/**
 * shadcn new-york-v4 registry item `calendar`.
 *
 * Local divergences (recorded in the divergence register):
 * - CalendarDayButton export removed (the function stays internal to
 *   Calendar);
 * - local nav and caption classNames: month_caption flex-center, dropdowns
 *   typography-small, caption_label h-11 dropdown target;
 * - day cell uses first:[&[data-selected=true]_button]:rounded-l-md and
 *   last:[&[data-selected=true]_button]:rounded-r-md instead of the upstream
 *   showWeekNumber-dependent nth-child form; month_grid drops
 *   defaultClassNames.month_grid;
 * - class token order in the root, months, month, nav, button_previous,
 *   button_next, dropdown_root, dropdown, caption_label, weekday, week,
 *   week_number_header, week_number, today and CalendarDayButton class
 *   strings;
 * - the day button's dark hover label is text-foreground, not upstream's
 *   dark:hover:text-accent-foreground, which is near-black on this theme's
 *   emerald accent/50 hover (2.63:1).
 *
 * Fix round 4, Part 5b (66.2-39; recorded in the divergence register):
 * - focus ring `ring-ring`, opaque, where upstream draws `ring-ring/50`: the
 *   half-alpha ring read 2.17-2.58:1 on the page, card and popover, under
 *   WCAG 1.4.11's 3:1;
 * - the today cell restates accent-foreground as its button's hover label: it
 *   paints solid accent under the button, where the dark hover label above
 *   (and the ghost Button's own) read 2.19:1; accent-foreground reads 8.01:1;
 * - the focused day's ring sits on a 2px background offset: on the today
 *   cell's solid accent the bare ring read 1.75:1.
 *
 * Fix round 4, Part 8e (66.2-39; recorded in the divergence register):
 * - `--cell-size` is 44px, not 32: the Button's 44px floor (`min-h-11`, with
 *   `aspect-square`) already makes every day 44px, and the caption's inset
 *   and the nav buttons now match it; below md the root pads 4px, not 12, and
 *   it is at most its container's width (`max-w-full`): at 320 the month was
 *   353.7px in a 318px popover, which scrolled sideways (WCAG 1.4.10);
 * - the weekday, week-number and day cells cancel the `@layer base` table
 *   rules (`p-0 border-0 bg-transparent`): their 16px side padding made each
 *   weekday 46-50px wide, so the month was 329.7px at every width, and the
 *   header painted muted cells with a border under them and under each week.
 */
import {
	ChevronDownIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
} from "lucide-react";
import type { ComponentProps } from "react";
import { useEffect, useRef } from "react";
import {
	type DayButton,
	DayPicker,
	getDefaultClassNames,
} from "react-day-picker";

import { Button, buttonVariants } from "#components/ui/button";
import { cn } from "#lib/utils";

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	captionLayout = "label",
	buttonVariant = "ghost",
	formatters,
	components,
	...props
}: ComponentProps<typeof DayPicker> & {
	buttonVariant?: ComponentProps<typeof Button>["variant"];
}) {
	const defaultClassNames = getDefaultClassNames();

	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn(
				"bg-background group/calendar p-1 md:p-3 [--cell-size:--spacing(11)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
				String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
				String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
				className,
			)}
			captionLayout={captionLayout}
			formatters={{
				formatMonthDropdown: (date) =>
					date.toLocaleString("default", { month: "short" }),
				...formatters,
			}}
			classNames={{
				root: cn("w-fit max-w-full", defaultClassNames.root),
				months: cn(
					"flex gap-4 flex-col md:flex-row relative",
					defaultClassNames.months,
				),
				month: cn("flex flex-col w-full gap-4", defaultClassNames.month),
				nav: cn(
					"flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between",
					defaultClassNames.nav,
				),
				button_previous: cn(
					buttonVariants({ variant: buttonVariant }),
					"size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
					defaultClassNames.button_previous,
				),
				button_next: cn(
					buttonVariants({ variant: buttonVariant }),
					"size-(--cell-size) aria-disabled:opacity-50 p-0 select-none",
					defaultClassNames.button_next,
				),
				month_caption: cn(
					"flex-center h-(--cell-size) w-full px-(--cell-size)",
					defaultClassNames.month_caption,
				),
				dropdowns: cn(
					"w-full flex items-center typography-small justify-center h-(--cell-size) gap-1.5",
					defaultClassNames.dropdowns,
				),
				dropdown_root: cn(
					"relative has-focus:border-ring border border-input shadow-xs has-focus:ring-ring has-focus:ring-[3px] rounded-md",
					defaultClassNames.dropdown_root,
				),
				dropdown: cn(
					"absolute bg-popover inset-0 opacity-0",
					defaultClassNames.dropdown,
				),
				caption_label: cn(
					"select-none font-medium",
					captionLayout === "label"
						? "text-sm"
						: "rounded-md pl-2 pr-1 flex items-center gap-1 text-sm h-11 [&>svg]:text-muted-foreground [&>svg]:size-3.5",
					defaultClassNames.caption_label,
				),
				month_grid: "w-full border-collapse",
				weekdays: cn("flex", defaultClassNames.weekdays),
				weekday: cn(
					"text-muted-foreground rounded-md flex-1 font-normal text-[0.8rem] select-none p-0 border-0 bg-transparent",
					defaultClassNames.weekday,
				),
				week: cn("flex w-full mt-2", defaultClassNames.week),
				week_number_header: cn(
					"select-none w-(--cell-size) p-0 border-0 bg-transparent",
					defaultClassNames.week_number_header,
				),
				week_number: cn(
					"text-[0.8rem] select-none text-muted-foreground p-0 border-0",
					defaultClassNames.week_number,
				),
				day: cn(
					"relative w-full h-full p-0 border-0 text-center first:[&[data-selected=true]_button]:rounded-l-md last:[&[data-selected=true]_button]:rounded-r-md group/day aspect-square select-none",
					defaultClassNames.day,
				),
				range_start: cn(
					"rounded-l-md bg-accent",
					defaultClassNames.range_start,
				),
				range_middle: cn("rounded-none", defaultClassNames.range_middle),
				range_end: cn("rounded-r-md bg-accent", defaultClassNames.range_end),
				today: cn(
					"bg-accent text-accent-foreground rounded-md data-[selected=true]:rounded-none [&>button]:hover:text-accent-foreground",
					defaultClassNames.today,
				),
				outside: cn(
					"text-muted-foreground aria-selected:text-muted-foreground",
					defaultClassNames.outside,
				),
				disabled: cn(
					"text-muted-foreground opacity-50",
					defaultClassNames.disabled,
				),
				hidden: cn("invisible", defaultClassNames.hidden),
				...classNames,
			}}
			components={{
				Root: ({ className, rootRef, ...props }) => {
					return (
						<div
							data-slot="calendar"
							ref={rootRef}
							className={cn(className)}
							{...props}
						/>
					);
				},
				Chevron: ({ className, orientation, ...props }) => {
					if (orientation === "left") {
						return (
							<ChevronLeftIcon className={cn("size-4", className)} {...props} />
						);
					}

					if (orientation === "right") {
						return (
							<ChevronRightIcon
								className={cn("size-4", className)}
								{...props}
							/>
						);
					}

					return (
						<ChevronDownIcon className={cn("size-4", className)} {...props} />
					);
				},
				DayButton: CalendarDayButton,
				WeekNumber: ({ children, ...props }) => {
					return (
						<td {...props}>
							<div className="flex size-(--cell-size) items-center justify-center text-center">
								{children}
							</div>
						</td>
					);
				},
				...components,
			}}
			{...props}
		/>
	);
}

function CalendarDayButton({
	className,
	day,
	modifiers,
	...props
}: ComponentProps<typeof DayButton>) {
	const defaultClassNames = getDefaultClassNames();

	const ref = useRef<HTMLButtonElement>(null);
	useEffect(() => {
		if (modifiers.focused) ref.current?.focus();
	}, [modifiers.focused]);

	return (
		<Button
			ref={ref}
			variant="ghost"
			size="icon"
			data-day={day.date.toLocaleDateString()}
			data-selected-single={
				modifiers.selected &&
				!modifiers.range_start &&
				!modifiers.range_end &&
				!modifiers.range_middle
			}
			data-range-start={modifiers.range_start}
			data-range-end={modifiers.range_end}
			data-range-middle={modifiers.range_middle}
			className={cn(
				"data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-ring dark:hover:text-foreground flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-offset-2 group-data-[focused=true]/day:ring-offset-background data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md [&>span]:text-xs [&>span]:opacity-70",
				defaultClassNames.day,
				className,
			)}
			{...props}
		/>
	);
}

export { Calendar };
