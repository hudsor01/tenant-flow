'use client'

import { useState } from 'react'
import { PenLine, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '#components/ui/button'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger
} from '#components/ui/dialog'
import { Checkbox } from '#components/ui/checkbox'
import { Label } from '#components/ui/label'
import { useSignLeaseAsOwner, useSignLeaseAsTenant } from '#hooks/api/use-lease'
import { cn } from '#lib/utils'

type SignerRole = 'owner' | 'tenant'

interface SignLeaseButtonProps {
	leaseId: string
	role: SignerRole
	disabled?: boolean
	alreadySigned?: boolean
	className?: string
	variant?: 'default' | 'outline' | 'secondary' | 'ghost'
	size?: 'default' | 'sm' | 'lg' | 'icon'
}

/**
 * Button component for signing a lease as owner or tenant
 * Shows a confirmation dialog with legal acknowledgment
 */
export function SignLeaseButton({
	leaseId,
	role,
	disabled = false,
	alreadySigned = false,
	className,
	variant = 'default',
	size = 'default'
}: SignLeaseButtonProps) {
	const [agreed, setAgreed] = useState(false)
	const [open, setOpen] = useState(false)
	const signAsOwner = useSignLeaseAsOwner()
	const signAsTenant = useSignLeaseAsTenant()

	const mutation = role === 'owner' ? signAsOwner : signAsTenant

	const handleSign = async () => {
		if (!agreed) {
			toast.error('Please agree to the terms before signing')
			return
		}

		try {
			await mutation.mutateAsync(leaseId)
			toast.success('Lease signed successfully', {
				description: 'Your signature has been recorded.',
				icon: <CheckCircle2 className="h-4 w-4 text-success" />
			})
			setOpen(false)
			setAgreed(false)
		} catch (error) {
			toast.error('Failed to sign lease', {
				description:
					error instanceof Error ? error.message : 'Please try again.',
				icon: <AlertCircle className="h-4 w-4 text-destructive" />
			})
		}
	}

	if (alreadySigned) {
		return (
			<Button
				variant="outline"
				size={size}
				disabled
				className={cn('gap-2 text-success border-success/20', className)}
			>
				<CheckCircle2 className="h-4 w-4" />
				Signed
			</Button>
		)
	}

	const roleLabel = role === 'owner' ? 'Owner' : 'Tenant'

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger asChild>
				<Button
					variant={variant}
					size={size}
					disabled={disabled}
					className={cn('gap-2', className)}
					data-testid={`sign-lease-${role}-button`}
				>
					<PenLine className="h-4 w-4" />
					Sign Lease
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Sign Lease Agreement</AlertDialogTitle>
					<AlertDialogDescription className="space-y-3">
						<p>
							You are about to electronically sign this lease agreement as the{' '}
							<strong>{roleLabel.toLowerCase()}</strong>.
						</p>
						<p>
							By signing, you acknowledge that you have read and agree to all
							terms and conditions outlined in the lease agreement.
						</p>
						<p className="text-warning font-medium">
							This action is legally binding and cannot be undone.
						</p>
					</AlertDialogDescription>
				</AlertDialogHeader>

				<div className="flex items-start gap-3 py-4 px-4 bg-muted/50 rounded-lg">
					<Checkbox
						id="agree-terms"
						checked={agreed}
						onCheckedChange={checked => setAgreed(checked === true)}
					/>
					<Label
						htmlFor="agree-terms"
						className="text-sm leading-relaxed cursor-pointer"
					>
						I confirm that I have read and understood the lease agreement, and I
						agree to be legally bound by its terms.
					</Label>
				</div>

				<AlertDialogFooter>
					<AlertDialogCancel disabled={mutation.isPending}>
						Cancel
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={e => {
							e.preventDefault()
							handleSign()
						}}
						disabled={!agreed || mutation.isPending}
						className="gap-2"
					>
						{mutation.isPending ? (
							'Signing...'
						) : (
							<>
								<PenLine className="h-4 w-4" />
								Sign as {roleLabel}
							</>
						)}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

interface SignLeaseActionsProps {
	leaseId: string
	role: SignerRole
	ownerSigned: boolean
	tenantSigned: boolean
	isPendingSignature: boolean
	className?: string
}

/**
 * Combined component showing appropriate actions based on lease state
 */
export function SignLeaseActions({
	leaseId,
	role,
	ownerSigned,
	tenantSigned,
	isPendingSignature,
	className
}: SignLeaseActionsProps) {
	const hasSigned = role === 'owner' ? ownerSigned : tenantSigned
	const bothSigned = ownerSigned && tenantSigned

	// If both signed, show completed state
	if (bothSigned) {
		return (
			<div className={cn('flex items-center gap-2 text-success', className)}>
				<CheckCircle2 className="h-5 w-5" />
				<span className="font-medium">Lease Fully Signed</span>
			</div>
		)
	}

	// If not in pending signature state, don't show sign button
	if (!isPendingSignature) {
		return null
	}

	return (
		<SignLeaseButton
			leaseId={leaseId}
			role={role}
			alreadySigned={hasSigned}
			className={className ?? ''}
		/>
	)
}
