"use client";

import { Button } from "#components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetTitle,
} from "#components/ui/sheet";
import type { TenantSectionDetail } from "#types/sections/tenants";
import {
	AccountInfoSection,
	ContactSection,
	CurrentLeaseSection,
	LeaseHistorySection,
} from "./tenant-detail-sheet-tabs";

interface TenantDetailSheetProps {
	tenant: TenantSectionDetail | null;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onEdit: (tenantId: string) => void;
	onContact: (tenantId: string, method: "email" | "phone") => void;
	onViewLease: (leaseId: string) => void;
}

export function TenantDetailSheet({
	tenant,
	isOpen,
	onOpenChange,
	onEdit,
	onContact,
	onViewLease,
}: TenantDetailSheetProps) {
	if (!tenant) return null;

	return (
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="inset-y-2 right-2 h-auto w-3/4 max-w-md gap-0 overflow-y-auto rounded-lg border-l bg-overlay text-overlay-fg ring ring-fg/5 sm:max-w-md"
			>
				{/* Header */}
				<div className="space-y-1 p-6 pb-3">
					<SheetTitle className="text-balance font-semibold text-fg text-lg/6 sm:text-base/6">
						{tenant.fullName}
					</SheetTitle>
					<SheetDescription className="text-pretty text-base/6 text-muted-foreground sm:text-sm/6">
						Tenant Profile
					</SheetDescription>
				</div>
				{/* Body - Scrollable */}
				<div className="isolate flex min-h-0 flex-1 flex-col overflow-auto px-6 py-1 space-y-6">
					<ContactSection tenant={tenant} onContact={onContact} />
					<CurrentLeaseSection tenant={tenant} onViewLease={onViewLease} />
					{tenant.emergencyContactName && (
						<section>
							<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
								Emergency Contact
							</h3>
							<div className="p-4 rounded-lg bg-muted/50 border border-border">
								<p className="font-medium text-foreground">
									{tenant.emergencyContactName}
								</p>
								<p className="text-sm text-muted-foreground">
									{tenant.emergencyContactRelationship}
								</p>
								{tenant.emergencyContactPhone && (
									<p className="text-sm text-muted-foreground mt-1">
										{tenant.emergencyContactPhone}
									</p>
								)}
							</div>
						</section>
					)}
					<LeaseHistorySection tenant={tenant} onViewLease={onViewLease} />
					<AccountInfoSection tenant={tenant} />
				</div>
				{/* Footer - Sticky */}
				<div className="isolate mt-auto flex flex-col-reverse justify-end gap-3 p-6 pt-4 sm:flex-row">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Close
					</Button>
					<Button variant="default" onClick={() => onEdit(tenant.id)}>
						Edit Profile
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
