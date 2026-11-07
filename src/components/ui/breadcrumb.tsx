import { ChevronRight } from "lucide-react";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "#lib/utils";

function Breadcrumb({ ...props }: ComponentProps<"nav">) {
	return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

/**
 * The list cancels the globals.css `@layer base` `ul, ol` / `li` rules on
 * itself (`pl-0 mt-0 mb-0 [&>li]:mb-0`, as SidebarMenu does, D-49): without
 * them every trail sat 24px right of the content it heads, 16px lower than its
 * container's padding declares, with 16px more below it.
 */
function BreadcrumbList({ className, ...props }: ComponentProps<"ol">) {
	return (
		<ol
			data-slot="breadcrumb-list"
			className={cn(
				"text-foreground flex flex-wrap items-center gap-2 pl-0 mt-0 mb-0 [&>li]:mb-0 text-base font-medium sm:gap-3",
				className,
			)}
			{...props}
		/>
	);
}

function BreadcrumbItem({ className, ...props }: ComponentProps<"li">) {
	return (
		<li
			data-slot="breadcrumb-item"
			className={cn("inline-flex items-center gap-1.5", className)}
			{...props}
		/>
	);
}

function BreadcrumbLink({
	asChild,
	className,
	...props
}: ComponentProps<"a"> & {
	asChild?: boolean;
}) {
	const Comp = asChild ? Slot.Slot : "a";

	return (
		<Comp
			data-slot="breadcrumb-link"
			className={cn(
				"hover:text-primary-text transition-colors font-medium",
				className,
			)}
			{...props}
		/>
	);
}

function BreadcrumbPage({ className, ...props }: ComponentProps<"span">) {
	return (
		<span
			data-slot="breadcrumb-page"
			aria-disabled="true"
			aria-current="page"
			className={cn("text-foreground font-normal", className)}
			{...props}
		/>
	);
}

function BreadcrumbSeparator({
	children,
	className,
	...props
}: ComponentProps<"li">) {
	return (
		<li
			data-slot="breadcrumb-separator"
			aria-hidden="true"
			className={cn("[&>svg]:size-3.5", className)}
			{...props}
		>
			{children ?? <ChevronRight />}
		</li>
	);
}

export type BreadcrumbItem = {
	href: string;
	label: string;
};

export {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
};
