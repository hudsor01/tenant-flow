import { Label } from '#components/ui/label'
import { Input } from '#components/ui/input'

interface AcquisitionDetailsSectionProps {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Form's generic signature is too complex for extracted components
	form: { Field: React.ComponentType<any> }
}

export function AcquisitionDetailsSection({ form }: AcquisitionDetailsSectionProps) {
	return (
		<div className="space-y-4 border rounded-lg p-6">
			<div>
				<h3 className="text-sm font-medium">Acquisition Details</h3>
				<p className="text-xs text-muted-foreground mt-1">
					Optional. Used for accurate depreciation calculations in your tax documents.
				</p>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<form.Field name="acquisition_cost">
					{(field: { state: { value: number | null; meta: { errors: unknown[] } }; handleChange: (v: number | null) => void; handleBlur: () => void }) => (
						<div className="space-y-2">
							<Label htmlFor="acquisition_cost">Purchase Price</Label>
							<Input
								id="acquisition_cost"
								type="number"
								step="0.01"
								min="0"
								placeholder="e.g. 250000"
								value={field.state.value ?? ''}
								onChange={e => {
									const raw = e.target.value
									field.handleChange(raw === '' ? null : parseFloat(raw))
								}}
								onBlur={field.handleBlur}
							/>
							{(field.state.meta.errors?.length ?? 0) > 0 && (
								<p className="text-xs text-destructive">
									{String(field.state.meta.errors[0])}
								</p>
							)}
						</div>
					)}
				</form.Field>
				<form.Field name="acquisition_date">
					{(field: { state: { value: string; meta: { errors: unknown[] } }; handleChange: (v: string) => void; handleBlur: () => void }) => (
						<div className="space-y-2">
							<Label htmlFor="acquisition_date">Purchase Date</Label>
							<Input
								id="acquisition_date"
								type="date"
								value={field.state.value ?? ''}
								onChange={e => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
							/>
							{(field.state.meta.errors?.length ?? 0) > 0 && (
								<p className="text-xs text-destructive">
									{String(field.state.meta.errors[0])}
								</p>
							)}
						</div>
					)}
				</form.Field>
			</div>
		</div>
	)
}
