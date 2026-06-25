import { Input } from "#components/ui/input";
import { Label } from "#components/ui/label";
import type { PropertyFormApi } from "./property-form-types";

interface AcquisitionDetailsSectionProps {
	form: PropertyFormApi;
}

export function AcquisitionDetailsSection({
	form,
}: AcquisitionDetailsSectionProps) {
	return (
		<div className="space-y-4 border rounded-lg p-6">
			<div>
				<h3 className="text-sm font-medium">Acquisition Details</h3>
				<p className="text-xs text-muted-foreground mt-1">
					Optional. Used for accurate depreciation calculations in your tax
					documents.
				</p>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<form.Field name="acquisition_cost">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor="acquisition_cost">Purchase Price</Label>
							<Input
								id="acquisition_cost"
								type="number"
								step="0.01"
								min="0"
								placeholder="e.g. 250000"
								value={field.state.value ?? ""}
								onChange={(e) => {
									const raw = e.target.value;
									field.handleChange(raw === "" ? null : parseFloat(raw));
								}}
								onBlur={field.handleBlur}
							/>
							{(field.state.meta.errors?.length ?? 0) > 0 && (
								<p className="text-xs text-destructive-text">
									{String(field.state.meta.errors[0])}
								</p>
							)}
						</div>
					)}
				</form.Field>
				<form.Field name="acquisition_date">
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor="acquisition_date">Purchase Date</Label>
							<Input
								id="acquisition_date"
								type="date"
								value={field.state.value ?? ""}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
							/>
							{(field.state.meta.errors?.length ?? 0) > 0 && (
								<p className="text-xs text-destructive-text">
									{String(field.state.meta.errors[0])}
								</p>
							)}
						</div>
					)}
				</form.Field>
			</div>
		</div>
	);
}
