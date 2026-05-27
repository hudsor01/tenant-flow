import { Building2, FileText, UserPlus, Wrench } from "lucide-react";

export type PortfolioRow = {
	id: string;
	property: string;
	address: string;
	units: { occupied: number; total: number };
	tenant: string | null;
	leaseStatus: "active" | "expiring" | "vacant";
	leaseEnd: string | null;
	rent: number;
	maintenanceOpen: number;
};

// CLAUDE.md "Project": TenantFlow does NOT facilitate rent payments.
// Quick actions cover record-management surfaces only (properties, leases,
// tenants, maintenance requests). A prior "Record Payment" tile was removed
// in Phase 4 cleanup (it dispatched to a never-wired callback).
export const quickActions = [
	{
		title: "Add Property",
		description: "Register a new property",
		icon: Building2,
		action: "addProperty",
	},
	{
		title: "Create Lease",
		description: "Draft a new lease agreement",
		icon: FileText,
		action: "createLease",
	},
	{
		title: "Add Tenant",
		description: "Create a tenant record",
		icon: UserPlus,
		action: "addTenant",
	},
	{
		title: "New Request",
		description: "Create maintenance request",
		icon: Wrench,
		action: "createRequest",
	},
] as const;

export type QuickActionType = (typeof quickActions)[number]["action"];
