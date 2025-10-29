'use client'

import { Spinner } from '#components/ui/spinner'
import type { PaymentMethodResponse } from '@repo/shared/types/core'
import {
	Building2,
	Check,
	CreditCard,
	MoreVertical,
	Plus,
	Trash2
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '#components/ui/button'
import { CardLayout } from '#components/ui/card-layout'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '#components/ui/dropdown-menu'

import {
	useDeletePaymentMethod,
	usePaymentMethods,
	useSetDefaultPaymentMethod
} from '#hooks/api/use-payment-methods'

import { AddPaymentMethodDialog } from '#app/(protected)/tenant/payments/methods/add-payment-method-dialog'

// Helper functions inlined from payment-methods-list.tsx
function getCardBrandDisplay(brand: string) {
	const brands: Record<string, string> = {
		visa: 'Visa',
		mastercard: 'Mastercard',
		amex: 'American Express',
		discover: 'Discover',
		diners: 'Diners Club',
		jcb: 'JCB',
		unionpay: 'UnionPay'
	}
	return brands[brand.toLowerCase()] || brand
}

function formatPaymentMethod(paymentMethod: PaymentMethodResponse) {
	if (paymentMethod.type === 'card') {
		return {
			icon: <CreditCard className="size-5" />,
			label: `${getCardBrandDisplay(paymentMethod.brand || 'Card')} ••••${paymentMethod.last4}`,
			details: null
		}
	} else if (paymentMethod.type === 'us_bank_account') {
		return {
			icon: <Building2 className="size-5" />,
			label: `${paymentMethod.bankName || 'Bank Account'} ••••${paymentMethod.last4}`,
			details: 'ACH Direct Debit'
		}
	}
	return {
		icon: <CreditCard className="size-5" />,
		label: `Payment Method ••••${paymentMethod.last4}`,
		details: null
	}
}

export function PaymentMethodsTab() {
	const [showAddDialog, setShowAddDialog] = useState(false)

	const { data: paymentMethods, isLoading, refetch } = usePaymentMethods()
	const setDefault = useSetDefaultPaymentMethod()
	const deleteMethod = useDeletePaymentMethod()

	const handleSetDefault = async (paymentMethodId: string) => {
		try {
			const result = await setDefault.mutateAsync(paymentMethodId)

			if (result.success) {
				toast.success('Default payment method updated')
				refetch()
			} else {
				toast.error('Failed to set default payment method')
			}
		} catch {
			toast.error('Failed to set default payment method')
		}
	}

	const handleDelete = async (paymentMethodId: string) => {
		try {
			const result = await deleteMethod.mutateAsync(paymentMethodId)

			if (result.success) {
				toast.success('Payment method removed')
				refetch()
			} else {
				toast.error('Failed to remove payment method')
			}
		} catch {
			toast.error('Failed to remove payment method')
		}
	}

	const handleAddSuccess = () => {
		refetch()
	}

	const hasPaymentMethods = paymentMethods && paymentMethods.length > 0

	return (
		<>
			<CardLayout
				title="Payment Methods"
				description="Manage your cards and bank accounts for rent payments"
			>
				<div className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="flex-1" />
						<Button onClick={() => setShowAddDialog(true)} size="sm">
							<Plus className="mr-2 size-4" />
							Add Payment Method
						</Button>
					</div>

					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<Spinner className="size-8 animate-spin text-muted-foreground" />
						</div>
					) : !hasPaymentMethods ? (
						<div className="text-center py-8">
							<CreditCard className="mx-auto size-12 text-muted-foreground mb-4" />
							<p className="text-sm text-muted-foreground mb-4">
								No payment methods saved yet
							</p>
							<Button
								onClick={() => setShowAddDialog(true)}
								variant="outline"
								size="sm"
							>
								<Plus className="mr-2 size-4" />
								Add Your First Payment Method
							</Button>
						</div>
					) : (
						<div className="space-y-3">
							{paymentMethods.map(method => {
								const display = formatPaymentMethod(method)

								return (
									<div
										key={method.id}
										className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
									>
										<div className="flex items-center gap-4">
											<div className="text-muted-foreground">
												{display.icon}
											</div>
											<div>
												<div className="flex items-center gap-2">
													<span className="font-medium">{display.label}</span>
													{method.isDefault && (
														<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
															<Check className="size-3" />
															Default
														</span>
													)}
												</div>
												{display.details && (
													<p className="text-sm text-muted-foreground">
														{display.details}
													</p>
												)}
											</div>
										</div>

										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="sm">
													<MoreVertical className="size-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												{!method.isDefault && (
													<DropdownMenuItem
														onClick={() => handleSetDefault(method.id)}
														disabled={setDefault.isPending}
													>
														<Check className="mr-2 size-4" />
														Set as Default
													</DropdownMenuItem>
												)}
												<DropdownMenuItem
													onClick={() => handleDelete(method.id)}
													disabled={deleteMethod.isPending}
													className="text-destructive focus:text-destructive"
												>
													<Trash2 className="mr-2 size-4" />
													Remove
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</div>
								)
							})}
						</div>
					)}
				</div>
			</CardLayout>

			<AddPaymentMethodDialog
				open={showAddDialog}
				onOpenChange={setShowAddDialog}
				onSuccess={handleAddSuccess}
			/>
		</>
	)
}
