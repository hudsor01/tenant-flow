"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, Download, Loader2, Trash2, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	ACCOUNT_DELETION_COPY,
	DeletionScheduledNotice,
} from "#components/settings/deletion-scheduled-notice";
import { downloadAccountData } from "#components/settings/download-account-data";
import { BlurFade } from "#components/ui/blur-fade";
import { authKeys } from "#hooks/api/use-auth";
import { userFacingErrorMessage } from "#lib/mutation-error-handler";
import { createClient } from "#lib/supabase/client";

export function AccountDataSection() {
	const [confirmText, setConfirmText] = useState("");
	const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

	const deletionStatus = useQuery({
		queryKey: authKeys.deletionStatus(),
		queryFn: async () => {
			const supabase = createClient();
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) throw new Error("Not authenticated");
			const { data, error } = await supabase
				.from("users")
				.select("deletion_requested_at")
				.eq("id", user.id)
				.single();
			if (error) throw error;
			return data;
		},
	});

	const exportData = useMutation({
		mutationFn: downloadAccountData,
		onSuccess: () => toast.success("Data export downloaded successfully"),
		onError: () => toast.error("Failed to export data. Please try again."),
	});

	const requestDeletion = useMutation({
		mutationFn: async () => {
			const supabase = createClient();
			const { error } = await supabase.rpc("request_account_deletion");
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Account deletion requested. You have 30 days to cancel.");
			setShowDeleteConfirm(false);
			setConfirmText("");
			deletionStatus.refetch();
		},
		// request_account_deletion() only stamps the request, so it never refuses
		// for a lease or a payment; an active lease delays the nightly job
		// instead (ACCOUNT_DELETION_COPY).
		onError: (err: Error) =>
			toast.error(userFacingErrorMessage(err, "Failed to request deletion")),
	});

	const cancelDeletion = useMutation({
		mutationFn: async () => {
			const supabase = createClient();
			const { error } = await supabase.rpc("cancel_account_deletion");
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Account deletion cancelled. Your account is safe.");
			deletionStatus.refetch();
		},
		onError: () => toast.error("Failed to cancel deletion. Please try again."),
	});

	const isPending =
		deletionStatus.data?.deletion_requested_at !== null &&
		deletionStatus.data?.deletion_requested_at !== undefined;

	return (
		<BlurFade delay={0.1}>
			<div className="space-y-6">
				<div>
					<h2 className="text-lg font-semibold">My Data</h2>
					<p className="text-sm text-muted-foreground">
						Manage your personal data in accordance with GDPR and CCPA rights
					</p>
				</div>

				{/* Data Export */}
				<section className="rounded-lg border bg-card p-6">
					<h3 className="mb-1 text-sm font-medium text-muted-foreground uppercase tracking-wider">
						Data Portability
					</h3>
					{/* What export-user-data returns: the profile and these tables,
					    with documents as a list (the files are not in it). It has no
					    rent ledger, inspections, vendors or applications (Part 8i). */}
					<p className="text-sm text-muted-foreground mb-4">
						Download your profile, properties, units, tenants, leases,
						maintenance requests, expenses and document list as a JSON file.
					</p>
					<button
						onClick={() => exportData.mutate()}
						disabled={exportData.isPending}
						className="inline-flex items-center gap-2 px-4 py-2 min-h-11 text-sm font-medium rounded-lg border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
					>
						{exportData.isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
						) : (
							<Download className="h-4 w-4" aria-hidden="true" />
						)}
						{exportData.isPending ? "Preparing export..." : "Download My Data"}
					</button>
				</section>

				{/* Delete Account */}
				<section className="rounded-lg border border-destructive/30 bg-destructive/5 p-6">
					<h3 className="mb-1 text-sm font-medium text-destructive-text uppercase tracking-wider">
						Danger Zone
					</h3>

					{isPending ? (
						<div className="space-y-4">
							<DeletionScheduledNotice
								deletionRequestedAt={
									deletionStatus.data!.deletion_requested_at!
								}
							/>
							<button
								onClick={() => cancelDeletion.mutate()}
								disabled={cancelDeletion.isPending}
								className="inline-flex items-center gap-2 px-4 py-2 min-h-11 text-sm font-medium rounded-lg border bg-background hover:bg-muted transition-colors disabled:opacity-50 disabled:pointer-events-none"
							>
								{cancelDeletion.isPending ? (
									<Loader2
										className="h-4 w-4 animate-spin"
										aria-hidden="true"
									/>
								) : (
									<Undo2 className="h-4 w-4" aria-hidden="true" />
								)}
								{cancelDeletion.isPending ? "Cancelling..." : "Cancel Deletion"}
							</button>
						</div>
					) : (
						<>
							<p className="text-sm text-muted-foreground mb-4">
								{ACCOUNT_DELETION_COPY.intro}
							</p>

							{!showDeleteConfirm ? (
								<button
									onClick={() => setShowDeleteConfirm(true)}
									className="inline-flex items-center gap-2 px-4 py-2 min-h-11 text-sm font-medium text-destructive-text border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors"
								>
									<Trash2 className="h-4 w-4" aria-hidden="true" />
									Delete My Account
								</button>
							) : (
								<div className="space-y-4 rounded-lg border border-destructive/20 bg-background p-4">
									<div className="flex items-start gap-3">
										<AlertTriangle
											className="h-5 w-5 text-destructive mt-0.5 shrink-0"
											aria-hidden="true"
										/>
										<div>
											<p className="mb-0 text-sm font-medium text-destructive-text">
												{ACCOUNT_DELETION_COPY.confirmTitle}
											</p>
											<p className="text-sm text-muted-foreground mt-1 mb-0">
												{ACCOUNT_DELETION_COPY.confirmBody}
											</p>
										</div>
									</div>
									<div className="grid gap-2">
										<label
											htmlFor="deleteConfirm"
											className="text-sm font-medium"
										>
											Type <span className="font-mono font-bold">DELETE</span>{" "}
											to confirm
										</label>
										<input
											id="deleteConfirm"
											type="text"
											value={confirmText}
											onChange={(e) => setConfirmText(e.target.value)}
											placeholder="DELETE"
											className="w-full max-w-sm px-3 py-2 h-11 text-sm rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-destructive/20 focus:border-destructive transition-all"
										/>
									</div>
									<div className="flex gap-3">
										<button
											onClick={() => requestDeletion.mutate()}
											disabled={
												confirmText !== "DELETE" || requestDeletion.isPending
											}
											className="inline-flex items-center gap-2 px-4 py-2 min-h-11 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive-text dark:hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
										>
											{requestDeletion.isPending ? (
												<Loader2
													className="h-4 w-4 animate-spin"
													aria-hidden="true"
												/>
											) : (
												<Trash2 className="h-4 w-4" aria-hidden="true" />
											)}
											Request Account Deletion
										</button>
										<button
											onClick={() => {
												setShowDeleteConfirm(false);
												setConfirmText("");
											}}
											className="px-4 py-2 min-h-11 text-sm font-medium rounded-lg border hover:bg-muted transition-colors"
										>
											Cancel
										</button>
									</div>
								</div>
							)}
						</>
					)}
				</section>
			</div>
		</BlurFade>
	);
}
