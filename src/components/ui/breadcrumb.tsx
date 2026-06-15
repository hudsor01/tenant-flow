import { ChevronRight } from "lucide-react";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";

import { cn } from "#lib/utils";

function Breadcrumb({ ...props }: ComponentProps<"nav">) {
	return <nav aria-label="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: ComponentProps<"ol">) {
	return (
		<ol
			className={cn(
				"text-foreground flex flex-wrap items-center gap-2 text-base font-medium sm:gap-3",
				className,
			)}
			{...props}
		/>
	);
}

function BreadcrumbItem({ className, ...props }: ComponentProps<"li">) {
	return (
		<li
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
