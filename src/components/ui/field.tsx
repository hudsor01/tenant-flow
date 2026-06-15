"use client";

import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { Label } from "#components/ui/label";
import { cn } from "#lib/utils";

function FieldGroup({ className, ...props }: ComponentProps<"div">) {
	return (
		<div
			data-slot="field-group"
			className={cn(
				"group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4",
				className,
			)}
			{...props}
		/>
	);
}

const fieldVariants = cva(
	"group/field flex w-full gap-3 data-[invalid=true]:text-destructive-text",
	{
		variants: {
			orientation: {
				vertical: ["flex-col [&>*]:w-full [&>.sr-only]:w-auto"],
				horizontal: [
					"flex-row items-center",
					"[&>[data-slot=field-label]]:flex-auto",
					"has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
				],
				responsive: [
					"flex-col [&>*]:w-full [&>.sr-only]:w-auto @md/field-group:flex-row @md/field-group:items-center @md/field-group:[&>*]:w-auto",
					"@md/field-group:[&>[data-slot=field-label]]:flex-auto",
					"@md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
				],
			},
		},
		defaultVariants: {
			orientation: "vertical",
		},
	},
);

function Field({
	className,
	orientation = "vertical",
	...props
}: ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
	return (
		<div
			role="group"
			data-slot="field"
			data-orientation={orientation}
			className={cn(fieldVariants({ orientation }), className)}
			{...props}
		/>
	);
}

function FieldLabel({ className, ...props }: ComponentProps<typeof Label>) {
	return (
		<Label
			data-slot="field-label"
			className={cn(
				"group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50",
				"has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4",
				"has-data-[state=checked]:bg-primary/5 has-data-[state=checked]:border-primary dark:has-data-[state=checked]:bg-primary/10",
				className,
			)}
			{...props}
		/>
	);
}

function FieldDescription({ className, ...props }: ComponentProps<"p">) {
	return (
		<p
			data-slot="field-description"
			className={cn(
				"text-muted-foreground text-sm leading-normal font-normal group-has-[[data-orientation=horizontal]]/field:text-balance",
				"last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5",
				"[&>a:hover]:text-primary-text [&>a]:underline [&>a]:underline-offset-4",
				className,
			)}
			{...props}
		/>
	);
}

function FieldError({
	className,
	children,
	errors,
	...props
}: ComponentProps<"div"> & {
	errors?: Array<{ message?: string } | string | null | undefined>;
}) {
	const content = (() => {
		if (children) {
			return children;
		}

		if (!errors) {
			return null;
		}

		const messages = errors
			.map((error) => {
				if (!error) {
					return null;
				}
				if (typeof error === "string") {
					return error;
				}
				if (typeof error === "object" && "message" in error) {
					const message = error?.message;
					return typeof message === "string" ? message : null;
				}
				return null;
			})
			.filter(Boolean) as string[];

		if (messages.length === 0) {
			return null;
		}

		if (messages.length === 1) {
			return messages[0];
		}

		return (
			<ul className="ml-4 flex list-disc flex-col gap-1">
				{messages.map((message) => (
					<li key={message}>{message}</li>
				))}
			</ul>
		);
	})();

	if (!content) {
		return null;
	}

	return (
		<div
			role="alert"
			data-slot="field-error"
			className={cn("text-destructive-text text-sm font-normal", className)}
			{...props}
		>
			{content}
		</div>
	);
}

export { Field, FieldDescription, FieldError, FieldGroup, FieldLabel };
