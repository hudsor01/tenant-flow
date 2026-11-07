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
 * - the caller className is merged with `cn`.
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
			className={cn(TOAST_TOKEN_CLASSES, className)}
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
