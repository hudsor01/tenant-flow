"use client";

/**
 * shadcn new-york-v4 registry item `sonner`, fetched 2026-10-31
 * (registry JSON sha256 prefix 439c5d5256091829).
 *
 * Local divergences (recorded in the divergence register):
 * - theme guard: `useTheme().theme ?? "system"` with one cast to the
 *   non-nullable theme prop type (upstream's destructured default fails
 *   TS2375 under exactOptionalPropertyTypes);
 * - token map: upstream's static inline style object becomes important
 *   arbitrary properties on the toaster className (zero-tolerance rule 5),
 *   referencing the `--color-*` theme variables;
 * - a 4000 ms default duration, overridable through `toastOptions`;
 * - the caller className is merged with `cn`;
 * - rich-color map: the success, info, warning and error toast variables
 *   point at the AA `-text` companions on a 10% status tint over the popover
 *   (Sonner's palette read 4.26 / 4.35:1 in light).
 */
import {
	CircleCheckIcon,
	InfoIcon,
	Loader2Icon,
	OctagonXIcon,
	TriangleAlertIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { cn } from "#lib/utils";

const TOAST_TOKEN_CLASSES =
	"[--normal-bg:var(--color-popover)]! [--normal-text:var(--color-popover-foreground)]! [--normal-border:var(--color-border)]! [--border-radius:var(--radius)]!";

/**
 * The rich-color toasts (the root layout's `richColors`) in the status-badge
 * treatment: the AA `-text` companion on a 10% tint of its status over the
 * popover. Sonner's own palette put the label under 4.5:1 in light (success
 * 4.26, error 4.35; 66.2-39 fix round 4, Part 5b).
 */
const TOAST_RICH_COLOR_CLASSES =
	"[--success-bg:color-mix(in_oklab,var(--color-success)_10%,var(--color-popover))]! [--success-border:color-mix(in_oklab,var(--color-success)_30%,var(--color-popover))]! [--success-text:var(--color-success-text)]! [--info-bg:color-mix(in_oklab,var(--color-info)_10%,var(--color-popover))]! [--info-border:color-mix(in_oklab,var(--color-info)_30%,var(--color-popover))]! [--info-text:var(--color-info-text)]! [--warning-bg:color-mix(in_oklab,var(--color-warning)_10%,var(--color-popover))]! [--warning-border:color-mix(in_oklab,var(--color-warning)_30%,var(--color-popover))]! [--warning-text:var(--color-warning-text)]! [--error-bg:color-mix(in_oklab,var(--color-destructive)_10%,var(--color-popover))]! [--error-border:color-mix(in_oklab,var(--color-destructive)_30%,var(--color-popover))]! [--error-text:var(--color-destructive-text)]!";

const TOAST_ICONS = {
	success: <CircleCheckIcon className="size-4" />,
	info: <InfoIcon className="size-4" />,
	warning: <TriangleAlertIcon className="size-4" />,
	error: <OctagonXIcon className="size-4" />,
	loading: <Loader2Icon className="size-4 animate-spin" />,
} satisfies NonNullable<ToasterProps["icons"]>;

const Toaster = ({ className, toastOptions, ...props }: ToasterProps) => {
	const theme = useTheme().theme ?? "system";

	return (
		<Sonner
			theme={theme as NonNullable<ToasterProps["theme"]>}
			className={cn(TOAST_TOKEN_CLASSES, TOAST_RICH_COLOR_CLASSES, className)}
			icons={TOAST_ICONS}
			toastOptions={{
				...toastOptions,
				duration: toastOptions?.duration ?? 4000,
			}}
			{...props}
		/>
	);
};

export { Toaster };
