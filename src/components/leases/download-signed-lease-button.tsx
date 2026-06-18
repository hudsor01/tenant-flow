"use client";

import { AlertCircle, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "#components/ui/button";
import { useSignedDocumentUrl } from "#hooks/api/use-lease";
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
	const { data, isLoading, error, refetch } = useSignedDocumentUrl(leaseId);

	const handleDownload = () => {
		if (!data?.document_url) {
			toast.error("Signed document not available");
			return;
		}

		// Open the document URL in a new tab for download
		window.open(data.document_url, "_blank");
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
					"gap-2 text-destructive-text border-destructive/30",
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
		// stuck finalize, the owner can still manually re-check — no dead-end.
		return (
			<Button
				variant={variant}
				size={size}
				onClick={() => refetch()}
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
