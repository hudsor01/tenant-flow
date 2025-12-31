'use client'

import { useState } from 'react'
import { FileText, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '#components/ui/dialog'
import { Textarea } from '#components/ui/textarea'
import { Label } from '#components/ui/label'
import { apiRequestRaw } from '#lib/api-request'
import {
	useSendLeaseForSignature,
	useResendSignatureRequest
} from '#hooks/api/use-lease'
import { cn } from '#lib/utils'

interface SendForSignatureButtonProps {
	leaseId: string
	tenantName?: string
	disabled?: boolean
	className?: string
	variant?: 'default' | 'outline' | 'secondary' | 'ghost'
	size?: 'default' | 'sm' | 'lg' | 'icon'
	/** Action type: 'send' for initial send, 'resend' to cancel and create fresh request */
	action?: 'send' | 'resend'
}

/**
 * Button that triggers the send-for-signature workflow
 * Opens a dialog to optionally add a message to the tenant
 */
export function SendForSignatureButton({
	leaseId,
	tenantName,
	disabled = false,
	className,
	variant = 'default',
	size = 'default',
	action = 'send'
}: SendForSignatureButtonProps) {
	const [open, setOpen] = useState(false)
	const [message, setMessage] = useState('')
	const [immediateFamilyMembers, setImmediateFamilyMembers] = useState('')
	const [landlordNoticeAddress, setLandlordNoticeAddress] = useState('')
	const [isPreviewing, setIsPreviewing] = useState(false)
	const sendForSignature = useSendLeaseForSignature()
	const resendSignature = useResendSignatureRequest()

	const isResend = action === 'resend'

	const handleSend = async () => {
		try {
			const trimmedMessage = message.trim()

			if (!isResend) {
				const noticeAddress = landlordNoticeAddress.trim()
				if (!noticeAddress) {
					toast.error('Landlord notice address is required')
					return
				}
			}

			if (isResend) {
				const payload: { leaseId: string; message?: string } = { leaseId }
				if (trimmedMessage) payload.message = trimmedMessage
				await resendSignature.mutateAsync(payload)
			} else {
				// Build payload conditionally to satisfy exactOptionalPropertyTypes
				const payload: {
					leaseId: string
					message?: string
					missingFields: {
						immediate_family_members: string
						landlord_notice_address: string
					}
				} = {
					leaseId,
					missingFields: {
						immediate_family_members: immediateFamilyMembers.trim(),
						landlord_notice_address: landlordNoticeAddress.trim()
					}
				}
				if (trimmedMessage) payload.message = trimmedMessage
				await sendForSignature.mutateAsync(payload)
			}

			toast.success(
				isResend ? 'Signature request resent' : 'Lease sent for signature',
				{
					description: tenantName
						? `${tenantName} will receive a notification to sign the lease.`
						: 'The tenant will receive a notification to sign the lease.'
				}
			)
			setOpen(false)
			setMessage('')
			setImmediateFamilyMembers('')
			setLandlordNoticeAddress('')
		} catch (error) {
			toast.error(
				isResend
					? 'Failed to resend signature request'
					: 'Failed to send lease for signature',
				{
					description:
						error instanceof Error ? error.message : 'Please try again.'
				}
			)
		}
	}

	const handlePreview = async () => {
		try {
			setIsPreviewing(true)
			const res = await apiRequestRaw(`/api/v1/leases/${leaseId}/pdf/preview`)
			const blob = await res.blob()
			const url = URL.createObjectURL(blob)
			window.open(url, '_blank', 'noopener,noreferrer')
			setTimeout(() => URL.revokeObjectURL(url), 60_000)
		} catch (error) {
			toast.error('Failed to preview PDF', {
				description:
					error instanceof Error ? error.message : 'Please try again.'
			})
		} finally {
			setIsPreviewing(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					variant={variant}
					size={size}
					disabled={disabled}
					className={cn('gap-2', className)}
					data-testid={
						isResend ? 'resend-signature-button' : 'send-for-signature-button'
					}
				>
					<Send className="h-4 w-4" />
					{isResend ? 'Resend' : 'Send for Signature'}
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{isResend ? 'Resend Signature Request' : 'Send Lease for Signature'}
					</DialogTitle>
					<DialogDescription>
						{isResend
							? tenantName
								? `Resend the signature request to ${tenantName}. This will create a fresh signing request.`
								: 'Resend the signature request. This will create a fresh signing request.'
							: tenantName
								? `Send this lease to ${tenantName} for review and signature.`
								: 'Send this lease to the tenant for review and signature.'}{' '}
						You can include an optional message.
					</DialogDescription>
				</DialogHeader>

				<div className="py-4">
					<Label htmlFor="signature-message" className="mb-2 block">
						Message (optional)
					</Label>
					<Textarea
						id="signature-message"
						placeholder="Add a personal message to the tenant..."
						value={message}
						onChange={e => setMessage(e.target.value)}
						rows={4}
						className="resize-none"
					/>
				</div>

				{!isResend && (
					<div className="space-y-4 pb-4">
						<div>
							<Label htmlFor="immediate-family-members" className="mb-2 block">
								Immediate family members (optional)
							</Label>
							<Textarea
								id="immediate-family-members"
								placeholder="List immediate family members (or leave blank for None)"
								value={immediateFamilyMembers}
								onChange={e => setImmediateFamilyMembers(e.target.value)}
								rows={3}
								className="resize-none"
							/>
						</div>
						<div>
							<Label htmlFor="landlord-notice-address" className="mb-2 block">
								Landlord notice address{' '}
								<span className="text-destructive">*</span>
							</Label>
							<Textarea
								id="landlord-notice-address"
								placeholder="Address where tenant must send formal notices..."
								value={landlordNoticeAddress}
								onChange={e => setLandlordNoticeAddress(e.target.value)}
								rows={3}
								className="resize-none"
							/>
						</div>
					</div>
				)}

				<DialogFooter>
					{!isResend && (
						<Button
							variant="outline"
							onClick={handlePreview}
							disabled={isPreviewing || sendForSignature.isPending}
							className="gap-2"
						>
							<FileText className="h-4 w-4" />
							{isPreviewing ? 'Loading...' : 'Preview PDF'}
						</Button>
					)}
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={sendForSignature.isPending || resendSignature.isPending}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSend}
						disabled={sendForSignature.isPending || resendSignature.isPending}
						className="gap-2"
					>
						{sendForSignature.isPending || resendSignature.isPending ? (
							<>{isResend ? 'Resending...' : 'Sending...'}</>
						) : (
							<>
								<Send className="h-4 w-4" />
								{isResend ? 'Resend' : 'Send for Signature'}
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
