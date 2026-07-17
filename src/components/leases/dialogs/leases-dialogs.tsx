import type { Lease } from "#types/core";
import { RenewLeaseDialog } from "./renew-lease-dialog";
import { TerminateLeaseDialog } from "./terminate-lease-dialog";

interface LeasesDialogsProps {
	selectedLease: Lease | null;
	showRenewDialog: boolean;
	showTerminateDialog: boolean;
	onRenewOpenChange: (open: boolean) => void;
	onTerminateOpenChange: (open: boolean) => void;
	onRenewSuccess: () => void;
	onTerminateSuccess: () => void;
}

export function LeasesDialogs({
	selectedLease,
	showRenewDialog,
	showTerminateDialog,
	onRenewOpenChange,
	onTerminateOpenChange,
	onRenewSuccess,
	onTerminateSuccess,
}: LeasesDialogsProps) {
	if (!selectedLease) return null;

	return (
		<>
			<RenewLeaseDialog
				open={showRenewDialog}
				onOpenChange={onRenewOpenChange}
				lease={selectedLease}
				onSuccess={onRenewSuccess}
			/>
			<TerminateLeaseDialog
				open={showTerminateDialog}
				onOpenChange={onTerminateOpenChange}
				lease={selectedLease}
				onSuccess={onTerminateSuccess}
			/>
		</>
	);
}
