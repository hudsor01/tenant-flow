"use client";

import { Button } from "#components/ui/button";
import { Checkbox } from "#components/ui/checkbox";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#components/ui/dialog";
import {
	PROPERTY_TYPE_OPTIONS,
	type PropertyType,
	toPropertyType,
} from "#lib/constants/status-types";
import type { PropertyStatus } from "#types/core";

interface PropertyBulkEditDialogProps {
	open: boolean;
	selectedCount: number;
	bulkEditStatus: PropertyStatus;
	/** Null when the first selected property's type is outside the set. */
	bulkEditType: PropertyType | null;
	applyBulkStatus: boolean;
	applyBulkType: boolean;
	isSaving: boolean;
	onOpenChange: (open: boolean) => void;
	onStatusChange: (status: PropertyStatus) => void;
	onTypeChange: (type: PropertyType) => void;
	onApplyStatusChange: (apply: boolean) => void;
	onApplyTypeChange: (apply: boolean) => void;
	onSubmit: () => void;
}

export function PropertyBulkEditDialog({
	open,
	selectedCount,
	bulkEditStatus,
	bulkEditType,
	applyBulkStatus,
	applyBulkType,
	isSaving,
	onOpenChange,
	onStatusChange,
	onTypeChange,
	onApplyStatusChange,
	onApplyTypeChange,
	onSubmit,
}: PropertyBulkEditDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent intent="edit">
				<DialogHeader>
					<DialogTitle>Bulk edit properties</DialogTitle>
					<DialogDescription>
						Apply changes to {selectedCount}{" "}
						{selectedCount === 1 ? "property" : "properties"}.
					</DialogDescription>
				</DialogHeader>
				<DialogBody>
					<div className="space-y-4">
						<div className="flex items-start gap-3">
							<Checkbox
								checked={applyBulkStatus}
								onCheckedChange={(checked) =>
									onApplyStatusChange(Boolean(checked))
								}
								aria-label="Apply status"
							/>
							<div className="flex-1 space-y-2">
								<label
									htmlFor="bulk-status"
									className="text-sm font-medium text-foreground"
								>
									Status
								</label>
								<select
									id="bulk-status"
									disabled={!applyBulkStatus}
									value={bulkEditStatus}
									onChange={(e) =>
										onStatusChange(e.target.value as PropertyStatus)
									}
									className="w-full appearance-none px-3 py-2 text-sm bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all h-9 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<option value="active">Active</option>
									<option value="inactive">Inactive</option>
									<option value="sold">Sold</option>
								</select>
							</div>
						</div>

						<div className="flex items-start gap-3">
							<Checkbox
								checked={applyBulkType}
								onCheckedChange={(checked) =>
									onApplyTypeChange(Boolean(checked))
								}
								aria-label="Apply property type"
							/>
							<div className="flex-1 space-y-2">
								<label
									htmlFor="bulk-type"
									className="text-sm font-medium text-foreground"
								>
									Property type
								</label>
								<select
									id="bulk-type"
									disabled={!applyBulkType}
									value={bulkEditType ?? ""}
									onChange={(e) => {
										const type = toPropertyType(e.target.value);
										if (type !== null) onTypeChange(type);
									}}
									className="w-full appearance-none px-3 py-2 text-sm bg-background border border-border rounded-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all h-9 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{bulkEditType === null && (
										<option value="" disabled>
											Select a type
										</option>
									)}
									{PROPERTY_TYPE_OPTIONS.map((option) => (
										<option key={option.value} value={option.value}>
											{option.label}
										</option>
									))}
								</select>
							</div>
						</div>
					</div>
				</DialogBody>
				<DialogFooter>
					<Button
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isSaving}
					>
						Cancel
					</Button>
					<Button
						onClick={onSubmit}
						disabled={
							isSaving ||
							(!applyBulkStatus && !applyBulkType) ||
							(applyBulkType && bulkEditType === null)
						}
					>
						{isSaving ? "Applying..." : `Apply to ${selectedCount}`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
