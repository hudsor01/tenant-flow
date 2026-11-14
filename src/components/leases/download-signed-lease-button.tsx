"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Download, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { isSignedLeaseDocument } from "#components/documents/documents-section-helpers";
import { Button } from "#components/ui/button";
import { documentQueries } from "#hooks/api/query-keys/document-keys";
import { useSignedDocumentUrl } from "#hooks/api/use-lease";
import {
	invalidateSignedLeaseVaultCopy,
	useFinalizeSignedLeaseMutation,
} from "#hooks/api/use-lease-signature-mutations";
import { cn } from "#lib/utils";

interface DownloadSignedLeaseButtonProps {
	leaseId: string;
	disabled?: boolean;
	className?: string;
	variant?: "default" | "outline" | "secondary" | "ghost";
	size?: "default" | "sm" | "lg" | "icon";
}

/**
 * Button to download the finalized signed lease PDF from storage
 * Only shows for active leases with completed signatures
 */
export function DownloadSignedLeaseButton({
	leaseId,
	disabled = false,
	className,
	variant = "outline",
	size = "default",
}: DownloadSignedLeaseButtonProps) {
	const queryClient = useQueryClient();
	const { data, dataUpdatedAt, isLoading, error, refetch } =
		useSignedDocumentUrl(leaseId);
	const { mutate: finalize } = useFinalizeSignedLeaseMutation();
	const autoFinalizedRef = useRef(false);
	const vaultRefreshedForRef = useRef<string | null>(null);

	// The signed PDF exists, so the vault holds its filed copy: the trigger files
	// it in the statement that writes the pointer. When the tenant signed last, no
	// mutation in this tab refreshed the lease's Documents list, so a list cached
	// before this snapshot that lacks the copy is refetched, at most once per
	// lease per mount. A copy still missing after that (filing skipped, or older
	// than the newest documents the list shows) stays missing.
	useEffect(() => {
		if (!data?.document_url || vaultRefreshedForRef.current === leaseId) return;
		const listKey = documentQueries.list({
			entityType: "lease",
			entityId: leaseId,
		}).queryKey;
		const listState = queryClient.getQueryState(listKey);
		const list = listState?.data;
		if (!list || listState.dataUpdatedAt >= dataUpdatedAt) return;
		if (list.rows.some(isSignedLeaseDocument)) return;
		vaultRefreshedForRef.current = leaseId;
		invalidateSignedLeaseVaultCopy(queryClient, leaseId);
	}, [data?.document_url, dataUpdatedAt, leaseId, queryClient]);

	// Both parties signed but the PDF pointer is still unwritten — the out-of-band
	// finalize may have failed. Auto-fire the idempotent owner-side finalize ONCE
	// per mount to self-heal; the bounded poll then surfaces the download.
	useEffect(() => {
		if (data?.finalizing && !autoFinalizedRef.current) {
			autoFinalizedRef.current = true;
			finalize(leaseId);
		}
	}, [data?.finalizing, leaseId, finalize]);

	const handleDownload = () => {
		if (!data?.document_url) {
			toast.error("Signed document not available");
			return;
		}

		// Open the document URL in a new tab for download
		window.open(data.document_url, "_blank", "noopener,noreferrer");
	};

	if (error) {
		// The signed PDF exists but its URL couldn't be minted (transient storage
		// failure) — surface a retry rather than hiding it as "not available".
		return (
			<Button
				variant="outline"
				size={size}
				onClick={() => {
					toast.error("Signed lease temporarily unavailable. Retrying…");
					refetch();
				}}
				className={cn(
					"gap-2 text-destructive-text border-destructive/30 hover:bg-destructive/10 hover:text-destructive-text dark:border-destructive/30 dark:hover:bg-destructive/20 dark:hover:text-destructive-text",
					className,
				)}
				data-testid="download-signed-lease-error"
			>
				<AlertCircle className="h-4 w-4" />
				Retry download
			</Button>
		);
	}

	if (isLoading) {
		return (
			<Button
				variant={variant}
				size={size}
				disabled
				className={cn("gap-2", className)}
			>
				<Loader2 className="h-4 w-4 animate-spin" />
				Loading...
			</Button>
		);
	}

	if (data?.finalizing) {
		// Both parties signed; the signed PDF is still being written out-of-band.
		// Clickable (not disabled) so that if the bounded auto-poll gives up on a
		// stuck finalize, the owner can re-trigger the idempotent finalize and
		// re-check — no dead-end.
		return (
			<Button
				variant={variant}
				size={size}
				onClick={() => {
					finalize(leaseId);
					refetch();
				}}
				className={cn("gap-2", className)}
				data-testid="download-signed-lease-finalizing"
			>
				<Loader2 className="h-4 w-4 animate-spin" />
				Finalizing signed document…
			</Button>
		);
	}

	if (!data?.document_url) {
		return null; // Don't show button if no document available
	}

	return (
		<Button
			variant={variant}
			size={size}
			disabled={disabled}
			onClick={handleDownload}
			className={cn("gap-2", className)}
			data-testid="download-signed-lease-button"
		>
			<Download className="h-4 w-4" />
			Download Signed Lease
		</Button>
	);
}
