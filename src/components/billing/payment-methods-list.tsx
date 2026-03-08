'use client'

import { useState } from 'react'
import {
	Building2,
	CreditCard,
	MoreVertical,
	Plus,
	Star,
	Trash2
} from 'lucide-react'
import { Badge } from '#components/ui/badge'
import { Button } from '#components/ui/button'
import { Card, CardContent } from '#components/ui/card'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'
import { Skeleton } from '#components/ui/skeleton'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle
} from '#components/ui/alert-dialog'
import {
	usePaymentMethods,
	useDeletePaymentMethod,
	useSetDefaultPaymentMethod
} from '#hooks/api/use-payment-methods'
import type { PaymentMethodResponse } from '#types/core'
import { cn } from '#lib/utils'

interface PaymentMethodsListProps {
	onAddClick: () => void
}

function getCardBrandIcon(brand: string) {
	const brandLower = (brand ?? '').toLowerCase()
	switch (brandLower) {
		case 'visa':
			return '💳 Visa'
		case 'mastercard':
			return '💳 Mastercard'
		case 'amex':
		case 'american_express':
			return '💳 Amex'
		case 'discover':
			return '💳 Discover'
		default:
			return '💳 Card'
	}
}

function PaymentMethodCard({
	method,
	onDelete,
	onSetDefault,
	isDeleting,
	isSettingDefault
}: {
	method: PaymentMethodResponse
	onDelete: (id: string) => void
	onSetDefault: (id: string) => void
	isDeleting: boolean
	isSettingDefault: boolean
}) {
	const [showDeleteDialog, setShowDeleteDialog] = useState(false)
	const isProcessing = isDeleting || isSettingDefault

	const getMethodDisplay = () => {
		if (method.type === 'card') {
			return {
				icon: <CreditCard className="size-5 text-muted-foreground" />,
				title: getCardBrandIcon(method.brand ?? ''),
				subtitle: method.last4 ? `•••• ${method.last4}` : '',
				detail: '',
				isLowerFees: false
			}
		}
		if (method.type === 'us_bank_account') {
			return {
				icon: <Building2 className="size-5 text-success" />,
				title: method.bankName ?? 'Bank Account',
				subtitle: method.last4 ? `•••• ${method.last4}` : '',
				detail: 'Bank Account',
				isLowerFees: true
			}
		}
		return {
			icon: <CreditCard className="size-5 text-muted-foreground" />,
			title: 'Payment Method',
			subtitle: '',
			detail: '',
			isLowerFees: false
		}
	}

	const display = getMethodDisplay()

	return (
		<>
			<Card
				className={cn(
					'transition-colors',
					method.isDefault && 'border-primary/50 bg-primary/5'
				)}
			>
				<CardContent className="flex items-center justify-between p-4">
					<div className="flex items-center gap-4">
						<div className="flex size-10 items-center justify-center rounded-lg bg-muted">
							{display.icon}
						</div>
						<div>
							<div className="flex items-center gap-2">
								<span className="font-medium text-foreground">
									{display.title}
								</span>
								{display.isLowerFees && (
									<Badge variant="outline" className="text-xs text-success border-success/50">
										Lower fees
									</Badge>
								)}
								{method.isDefault && (
									<Badge variant="success" className="text-xs">
										Default
									</Badge>
								)}
							</div>
							<div className="flex items-center gap-2 text-sm text-muted-foreground">
								<span>{display.subtitle}</span>
								{display.detail && (
									<>
										<span>·</span>
										<span>{display.detail}</span>
									</>
								)}
							</div>
						</div>
					</div>

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="sm"
								disabled={isProcessing}
								className="size-8 p-0"
							>
								{isProcessing ? (
									<div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
								) : (
									<MoreVertical className="size-4" />
								)}
								<span className="sr-only">Payment method actions</span>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{!method.isDefault && (
								<DropdownMenuItem
									onClick={() => onSetDefault(method.id)}
									disabled={isProcessing}
								>
									<Star className="mr-2 size-4" />
									Set as Default
								</DropdownMenuItem>
							)}
							{!method.isDefault && <DropdownMenuSeparator />}
							<DropdownMenuItem
								onClick={() => setShowDeleteDialog(true)}
								disabled={isProcessing}
								className="text-destructive focus:text-destructive"
							>
								<Trash2 className="mr-2 size-4" />
								Remove
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</CardContent>
			</Card>

			<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Payment Method</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to remove this payment method? This action
							cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								onDelete(method.id)
								setShowDeleteDialog(false)
							}}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Remove
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

function PaymentMethodSkeleton() {
	return (
		<Card>
			<CardContent className="flex items-center justify-between p-4">
				<div className="flex items-center gap-4">
					<Skeleton className="size-10 rounded-lg" />
					<div className="space-y-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-3 w-32" />
					</div>
				</div>
				<Skeleton className="size-8 rounded-md" />
			</CardContent>
		</Card>
	)
}

export function PaymentMethodsList({ onAddClick }: PaymentMethodsListProps) {
	const { data: paymentMethods, isLoading, error } = usePaymentMethods()
	const deletePaymentMethod = useDeletePaymentMethod()
	const setDefaultPaymentMethod = useSetDefaultPaymentMethod()

	if (isLoading) {
		return (
			<div className="space-y-3">
				<PaymentMethodSkeleton />
				<PaymentMethodSkeleton />
			</div>
		)
	}

	if (error) {
		return (
			<Card>
				<CardContent className="py-8 text-center">
					<p className="text-muted-foreground">
						Failed to load payment methods. Please try again.
					</p>
				</CardContent>
			</Card>
		)
	}

	if (!paymentMethods || paymentMethods.length === 0) {
		return (
			<Card>
				<CardContent className="py-12 text-center">
					<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-lg bg-muted">
						<Building2 className="size-8 text-success" />
					</div>
					<h3 className="mb-2 text-lg font-semibold text-foreground">
						No payment methods
					</h3>
					<p className="mb-2 text-muted-foreground">
						Add a payment method to enable automatic rent payments.
					</p>
					<p className="mb-6 text-sm text-success">
						Bank accounts save up to $39 per payment vs credit cards.
					</p>
					<Button onClick={onAddClick} className="min-h-11">
						<Plus className="mr-2 size-4" />
						Add Payment Method
					</Button>
				</CardContent>
			</Card>
		)
	}

	// Sort: bank accounts first (lower fees), then cards
	const sortedMethods = [...paymentMethods].sort((a, b) => {
		if (a.type === 'us_bank_account' && b.type !== 'us_bank_account') return -1
		if (a.type !== 'us_bank_account' && b.type === 'us_bank_account') return 1
		// Within same type, default first
		if (a.isDefault && !b.isDefault) return -1
		if (!a.isDefault && b.isDefault) return 1
		return 0
	})

	return (
		<div className="space-y-3">
			{sortedMethods.map(method => (
				<PaymentMethodCard
					key={method.id}
					method={method}
					onDelete={id => deletePaymentMethod.mutate(id)}
					onSetDefault={id => setDefaultPaymentMethod.mutate(id)}
					isDeleting={
						deletePaymentMethod.isPending &&
						deletePaymentMethod.variables === method.id
					}
					isSettingDefault={
						setDefaultPaymentMethod.isPending &&
						setDefaultPaymentMethod.variables === method.id
					}
				/>
			))}
		</div>
	)
}
