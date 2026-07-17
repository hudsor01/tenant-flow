"use client";

import { useTheme } from "next-themes";
import type { ToasterProps } from "sonner";
import { Toaster as Sonner } from "sonner";
import { cn } from "#lib/utils";

const Toaster = ({ className, toastOptions, ...props }: ToasterProps) => {
	const theme = useTheme().theme ?? "system";

	return (
		<Sonner
			theme={theme as NonNullable<ToasterProps["theme"]>}
			className={cn("toaster group", className)}
			toastOptions={{
				duration: toastOptions?.duration ?? 4000,
				...toastOptions,
				className: cn("sonner-toast", toastOptions?.className),
				classNames: {
					...toastOptions?.classNames,
					title: cn("sonner-toast__title", toastOptions?.classNames?.title),
					description: cn(
						"sonner-toast__description",
						toastOptions?.classNames?.description,
					),
					actionButton: cn(
						"sonner-toast__action",
						toastOptions?.classNames?.actionButton,
					),
					cancelButton: cn(
						"sonner-toast__cancel",
						toastOptions?.classNames?.cancelButton,
					),
				},
			}}
			{...props}
		/>
	);
};

export { Toaster };
