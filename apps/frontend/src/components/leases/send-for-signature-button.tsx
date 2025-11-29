'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
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
import { useSendLeaseForSignature } from '#hooks/api/use-lease'
import { cn } from '#lib/utils'

interface SendForSignatureButtonProps {
	leaseId: string
	tenantName?: string
	disabled?: boolean
	className?: string
	variant?: 'default' | 'outline' | 'secondary' | 'ghost'
	size?: 'default' | 'sm' | 'lg' | 'icon'
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
	size = 'default'
}: SendForSignatureButtonProps) {
	const [open, setOpen] = useState(false)
	const [message, setMessage] = useState('')
	const sendForSignature = useSendLeaseForSignature()

	const handleSend = async () => {
		try {
			const trimmedMessage = message.trim()
			const payload: { leaseId: string; message?: string } = { leaseId }
			if (trimmedMessage) {
				payload.message = trimmedMessage
			}
			await sendForSignature.mutateAsync(payload)
			toast.success('Lease sent for signature', {
				description: tenantName
					? `${tenantName} will receive a notification to sign the lease.`
					: 'The tenant will receive a notification to sign the lease.'
			})
			setOpen(false)
			setMessage('')
		} catch (error) {
			toast.error('Failed to send lease for signature', {
				description:
					error instanceof Error ? error.message : 'Please try again.'
			})
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
					data-testid="send-for-signature-button"
				>
					<Send className="h-4 w-4" />
					Send for Signature
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Send Lease for Signature</DialogTitle>
					<DialogDescription>
						{tenantName
							? `Send this lease to ${tenantName} for review and signature.`
							: 'Send this lease to the tenant for review and signature.'}
						{' '}You can include an optional message.
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

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => setOpen(false)}
						disabled={sendForSignature.isPending}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSend}
						disabled={sendForSignature.isPending}
						className="gap-2"
					>
						{sendForSignature.isPending ? (
							<>Sending...</>
						) : (
							<>
								<Send className="h-4 w-4" />
								Send for Signature
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
