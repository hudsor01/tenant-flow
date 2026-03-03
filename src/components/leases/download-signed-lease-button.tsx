'use client'

import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#components/ui/button'
import { useSignedDocumentUrl } from '#hooks/api/use-lease'
import { cn } from '#lib/utils'

interface DownloadSignedLeaseButtonProps {
	leaseId: string
	disabled?: boolean
	className?: string
	variant?: 'default' | 'outline' | 'secondary' | 'ghost'
	size?: 'default' | 'sm' | 'lg' | 'icon'
}

/**
 * Button to download the signed lease document from DocuSeal
 * Only shows for active leases with completed signatures
 */
export function DownloadSignedLeaseButton({
	leaseId,
	disabled = false,
	className,
	variant = 'outline',
	size = 'default'
}: DownloadSignedLeaseButtonProps) {
	const { data, isLoading, error } = useSignedDocumentUrl(leaseId)

	const handleDownload = () => {
		if (!data?.document_url) {
			toast.error('Signed document not available')
			return
		}

		// Open the document URL in a new tab for download
		window.open(data.document_url, '_blank')
	}

	if (error) {
		return null // Don't show button if there's an error
	}

	if (isLoading) {
		return (
			<Button
				variant={variant}
				size={size}
				disabled
				className={cn('gap-2', className)}
			>
				<Loader2 className="h-4 w-4 animate-spin" />
				Loading...
			</Button>
		)
	}

	if (!data?.document_url) {
		return null // Don't show button if no document available
	}

	return (
		<Button
			variant={variant}
			size={size}
			disabled={disabled}
			onClick={handleDownload}
			className={cn('gap-2', className)}
			data-testid="download-signed-lease-button"
		>
			<Download className="h-4 w-4" />
			Download Signed Lease
		</Button>
	)
}
