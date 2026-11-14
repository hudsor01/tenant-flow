"use client";

import { useQuery } from "@tanstack/react-query";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { vendorQueries } from "#hooks/api/query-keys/vendor-keys";
import { vendorTradeLabel } from "#lib/constants/status-types";
import { cn } from "#lib/utils";

/**
 * The item value that stands for "no vendor". A Radix Select item cannot have
 * an empty value, and a vendor id is a uuid, so this never collides with one.
 */
const NO_VENDOR = "none";

interface VendorSelectProps {
	id: string;
	/** The assigned vendor's id; null with none. */
	value: string | null;
	onChange: (vendorId: string | null) => void;
	/**
	 * The assigned vendor's name, for one the active list does not hold (a
	 * vendor marked inactive after it was assigned), so the trigger still
	 * names it.
	 */
	currentVendorName?: string | null | undefined;
	disabled?: boolean | undefined;
	"aria-labelledby"?: string | undefined;
	className?: string | undefined;
}

/**
 * Picks a maintenance request's vendor from the owner's active vendors, by
 * name and trade, or "No vendor".
 */
export function VendorSelect({
	id,
	value,
	onChange,
	currentVendorName,
	disabled,
	"aria-labelledby": ariaLabelledBy,
	className,
}: VendorSelectProps) {
	const { data: vendors, isLoading } = useQuery(vendorQueries.allActive());
	const activeVendors = vendors ?? [];
	const assignedIsListed =
		value === null || activeVendors.some((vendor) => vendor.id === value);

	return (
		<Select
			value={value ?? NO_VENDOR}
			onValueChange={(next) => onChange(next === NO_VENDOR ? null : next)}
			disabled={disabled || isLoading}
		>
			<SelectTrigger
				id={id}
				aria-labelledby={ariaLabelledBy}
				className={cn("w-full justify-between", className)}
			>
				<SelectValue placeholder="No vendor" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={NO_VENDOR}>No vendor</SelectItem>
				{!assignedIsListed && value !== null && (
					<SelectItem value={value}>
						{`${currentVendorName ?? "Current vendor"} (inactive)`}
					</SelectItem>
				)}
				{activeVendors.map((vendor) => (
					<SelectItem key={vendor.id} value={vendor.id}>
						{`${vendor.name} · ${vendorTradeLabel(vendor.trade)}`}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
