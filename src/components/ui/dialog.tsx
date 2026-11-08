"use client";

/**
 * shadcn new-york-v4 registry item `dialog` (other local divergences are
 * recorded in the divergence register).
 *
 * Fix round 4, Part 5d (66.2-39; recorded in the divergence register):
 * - DialogContent declares its one column (`grid-cols-1`, a minmax(0, 1fr)
 *   track), where upstream leaves the grid's implicit auto track: content
 *   wider than the dialog widened that track past the dialog's max-width.
 *   At 390x844 the bulk-import dialog's data preview table drew the stepper
 *   and the Back / Import buttons 564px wide in a 308px body, the dialog
 *   scrolling sideways; now each row is the dialog's width and the preview
 *   table scrolls in its own wrapper.
 *
 * Fix round 4, Part 8e (66.2-39; recorded in the divergence register):
 * - DialogContent is at most the viewport's height less 2rem and scrolls inside
 *   (`max-h-[calc(100dvh-2rem)] overflow-y-auto`), where upstream sets no
 *   bound: centered on a fixed position with the page's scroll locked, a
 *   taller dialog had no way to reach its ends (at 320x900 the record
 *   receipt dialog was 917.56px, 8.78px past the top and the bottom).
 */
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "#lib/utils";

// Intent variants for semantic dialog styling
const dialogContentVariants = cva(
	"bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] grid-cols-1 translate-x-[-50%] translate-y-[-50%] gap-4 overflow-y-auto rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
	{
		variants: {
			intent: {
				default: "",
				create: "border-l-4 border-l-success",
				read: "",
				edit: "border-l-4 border-l-primary",
				delete: "border-l-4 border-l-destructive",
			},
		},
		defaultVariants: {
			intent: "default",
		},
	},
);

export type DialogIntent = VariantProps<typeof dialogContentVariants>["intent"];

function Dialog({ ...props }: ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
	...props
}: ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
	...props
}: ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
	...props
}: ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
	className,
	...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			className={cn(
				"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
				className,
			)}
			{...props}
		/>
	);
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
	intent,
	...props
}: ComponentProps<typeof DialogPrimitive.Content> & {
	showCloseButton?: boolean;
	intent?: DialogIntent;
}) {
	return (
		<DialogPortal data-slot="dialog-portal">
			<DialogOverlay />
			<DialogPrimitive.Content
				data-slot="dialog-content"
				className={cn(dialogContentVariants({ intent }), className)}
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="dialog-close"
						className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
					>
						<XIcon />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Content>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-header"
			className={cn("flex flex-col gap-2 text-center sm:text-left", className)}
			{...props}
		/>
	);
}

function DialogFooter({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn(
				"flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
				className,
			)}
			{...props}
		/>
	);
}

function DialogTitle({
	className,
	...props
}: ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn("text-lg leading-none font-semibold", className)}
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

function DialogBody({ className, ...props }: ComponentProps<"div">) {
	return <div className={cn("space-y-4", className)} {...props} />;
}

export {
	Dialog,
	DialogBody,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
};
