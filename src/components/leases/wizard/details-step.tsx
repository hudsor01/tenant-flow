"use client";

import { AlertTriangle } from "lucide-react";
import { Checkbox } from "#components/ui/checkbox";
import { FieldError } from "#components/ui/field";
import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#components/ui/select";
import { Switch } from "#components/ui/switch";
import { Textarea } from "#components/ui/textarea";
import type { LeaseDetailsStepData } from "#lib/validation/lease-wizard.schemas";

interface DetailsStepProps {
	data: Partial<LeaseDetailsStepData>;
	onChange: (data: Partial<LeaseDetailsStepData>) => void;
	/** Per-field validation messages surfaced on a failed step advance (FORM-09). */
	errors?: Partial<Record<string, string>>;
}

const UTILITY_OPTIONS = [
	{ value: "electricity", label: "Electricity" },
	{ value: "gas", label: "Gas" },
	{ value: "water", label: "Water" },
	{ value: "sewer", label: "Sewer" },
	{ value: "trash", label: "Trash" },
	{ value: "internet", label: "Internet" },
	{ value: "cable", label: "Cable" },
	{ value: "lawn_care", label: "Lawn Care" },
	{ value: "pest_control", label: "Pest Control" },
	{ value: "hoa_fees", label: "HOA Fees" },
];

const US_STATES = [
	{ value: "TX", label: "Texas" },
	{ value: "CA", label: "California" },
	{ value: "FL", label: "Florida" },
	{ value: "NY", label: "New York" },
	{ value: "IL", label: "Illinois" },
	{ value: "PA", label: "Pennsylvania" },
	{ value: "OH", label: "Ohio" },
	{ value: "GA", label: "Georgia" },
	{ value: "NC", label: "North Carolina" },
	{ value: "MI", label: "Michigan" },
];

export function DetailsStep({ data, onChange, errors }: DetailsStepProps) {
	const handleChange = <K extends keyof LeaseDetailsStepData>(
		field: K,
		value: LeaseDetailsStepData[K],
	) => {
		onChange({ ...data, [field]: value });
	};

	const toggleUtility = (
		field: "utilities_included" | "tenant_responsible_utilities",
		utility: string,
	) => {
		const current = data[field] || [];
		const updated = current.includes(utility)
			? current.filter((u) => u !== utility)
			: [...current, utility];
		handleChange(field, updated);
	};

	const dollarsToDisplay = (value: number | undefined) =>
		value === undefined ? "" : value.toString();

	// Pet deposit/rent map to integer columns — round to whole dollars so a stray
	// cents entry can never reach the insert (the input also uses step="1").
	const parseDollars = (value: string): number | undefined => {
		if (value === "") return undefined;
		const num = Number.parseFloat(value);
		return Number.isNaN(num) ? undefined : Math.round(num);
	};

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-medium mb-4">Lease Details</h3>
				<p className="text-muted-foreground text-sm mb-6">
					Configure occupancy limits, pet policy, utilities, and required
					disclosures.
				</p>
			</div>

			<div className="space-y-4">
				<h4 className="font-medium">Occupancy</h4>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="max_occupants">Maximum Occupants</Label>
						<Input
							id="max_occupants"
							type="number"
							min="1"
							max="20"
							placeholder="2"
							value={data.max_occupants || ""}
							onChange={(e) =>
								handleChange(
									"max_occupants",
									parseInt(e.target.value, 10) || undefined,
								)
							}
						/>
						{errors?.max_occupants ? (
							<FieldError>{errors.max_occupants}</FieldError>
						) : null}
					</div>
					<div className="space-y-2">
						<Label htmlFor="governing_state">Governing State</Label>
						<Select
							value={data.governing_state || "TX"}
							onValueChange={(value) =>
								handleChange(
									"governing_state",
									value as LeaseDetailsStepData["governing_state"],
								)
							}
						>
							<SelectTrigger id="governing_state">
								<SelectValue placeholder="Select state" />
							</SelectTrigger>
							<SelectContent>
								{US_STATES.map((state) => (
									<SelectItem key={state.value} value={state.value}>
										{state.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</div>

			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h4 className="font-medium">Pet Policy</h4>
					<div className="flex items-center gap-2">
						<Switch
							id="pets_allowed"
							checked={data.pets_allowed || false}
							onCheckedChange={(checked) =>
								handleChange("pets_allowed", checked)
							}
						/>
						<Label htmlFor="pets_allowed">Pets Allowed</Label>
					</div>
				</div>

				{data.pets_allowed && (
					<div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
						<div className="space-y-2">
							<Label htmlFor="pet_deposit">Pet Deposit ($)</Label>
							<Input
								id="pet_deposit"
								type="number"
								step="1"
								min="0"
								placeholder="300"
								value={dollarsToDisplay(data.pet_deposit ?? undefined)}
								onChange={(e) =>
									handleChange("pet_deposit", parseDollars(e.target.value))
								}
							/>
							{errors?.pet_deposit ? (
								<FieldError>{errors.pet_deposit}</FieldError>
							) : null}
						</div>
						<div className="space-y-2">
							<Label htmlFor="pet_rent">Monthly Pet Rent ($)</Label>
							<Input
								id="pet_rent"
								type="number"
								step="1"
								min="0"
								placeholder="25"
								value={dollarsToDisplay(data.pet_rent ?? undefined)}
								onChange={(e) =>
									handleChange("pet_rent", parseDollars(e.target.value))
								}
							/>
							{errors?.pet_rent ? (
								<FieldError>{errors.pet_rent}</FieldError>
							) : null}
						</div>
					</div>
				)}
			</div>

			<div className="space-y-4">
				<h4 className="font-medium">Utilities</h4>
				<div className="grid grid-cols-2 gap-6">
					<div className="space-y-3">
						<Label>Included in Rent</Label>
						<div className="space-y-2">
							{UTILITY_OPTIONS.map((utility) => (
								<div key={utility.value} className="flex items-center gap-2">
									<Checkbox
										id={`included-${utility.value}`}
										checked={(data.utilities_included || []).includes(
											utility.value,
										)}
										onCheckedChange={() =>
											toggleUtility("utilities_included", utility.value)
										}
									/>
									<Label
										htmlFor={`included-${utility.value}`}
										className="font-normal"
									>
										{utility.label}
									</Label>
								</div>
							))}
						</div>
					</div>
					<div className="space-y-3">
						<Label>Tenant Responsible</Label>
						<div className="space-y-2">
							{UTILITY_OPTIONS.map((utility) => (
								<div key={utility.value} className="flex items-center gap-2">
									<Checkbox
										id={`tenant-${utility.value}`}
										checked={(data.tenant_responsible_utilities || []).includes(
											utility.value,
										)}
										onCheckedChange={() =>
											toggleUtility(
												"tenant_responsible_utilities",
												utility.value,
											)
										}
									/>
									<Label
										htmlFor={`tenant-${utility.value}`}
										className="font-normal"
									>
										{utility.label}
									</Label>
								</div>
							))}
						</div>
					</div>
				</div>
			</div>

			<div className="space-y-2">
				<Label htmlFor="property_rules">Property Rules</Label>
				<Textarea
					id="property_rules"
					placeholder="Enter any additional property rules or restrictions..."
					rows={4}
					value={data.property_rules || ""}
					onChange={(e) => handleChange("property_rules", e.target.value)}
				/>
			</div>

			<div className="space-y-4 p-4 border rounded-lg bg-muted/50">
				<div className="flex items-start gap-3">
					<AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
					<div className="space-y-3 flex-1">
						<h4 className="font-medium">Lead-Based Paint Disclosure</h4>
						<p className="text-sm text-muted-foreground">
							Federal law requires disclosure of known lead-based paint hazards
							for housing built before 1978.
						</p>

						<div className="flex items-center gap-2">
							<Checkbox
								id="property_built_before_1978"
								checked={data.property_built_before_1978 || false}
								onCheckedChange={(checked) =>
									handleChange("property_built_before_1978", !!checked)
								}
							/>
							<Label
								htmlFor="property_built_before_1978"
								className="font-normal"
							>
								Property was built before 1978
							</Label>
						</div>

						{data.property_built_before_1978 && (
							<div className="flex items-center gap-2 pl-6">
								<Checkbox
									id="lead_paint_disclosure_acknowledged"
									checked={data.lead_paint_disclosure_acknowledged || false}
									onCheckedChange={(checked) =>
										handleChange(
											"lead_paint_disclosure_acknowledged",
											!!checked,
										)
									}
								/>
								<Label
									htmlFor="lead_paint_disclosure_acknowledged"
									className="font-normal text-sm"
								>
									I acknowledge that lead-based paint disclosure has been
									provided to the tenant *
								</Label>
							</div>
						)}

						{errors?.lead_paint_disclosure_acknowledged ? (
							<FieldError>
								{errors.lead_paint_disclosure_acknowledged}
							</FieldError>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
