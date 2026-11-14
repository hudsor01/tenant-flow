import type { ReactNode } from "react";

interface ContactRowProps {
	icon: ReactNode;
	label: string;
	value: string | null;
	/** A tel: or mailto: link for the value; plain text without one. */
	href?: string | undefined;
}

/**
 * One line of a contact card on the maintenance detail page: how to reach the
 * request's tenant or its vendor.
 */
export function ContactRow({ icon, label, value, href }: ContactRowProps) {
	return (
		<div className="flex items-start gap-3">
			<div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
				{icon}
			</div>
			<div className="min-w-0">
				<p className="mb-0 text-sm text-muted-foreground">{label}</p>
				<p className="mb-0 font-medium text-sm wrap-break-word">
					{value !== null && href ? (
						<a
							href={href}
							className="text-primary-text underline-offset-4 hover:underline"
						>
							{value}
						</a>
					) : (
						(value ?? "Not provided")
					)}
				</p>
			</div>
		</div>
	);
}
