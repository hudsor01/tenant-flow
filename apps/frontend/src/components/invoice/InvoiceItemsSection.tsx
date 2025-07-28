import { Plus, Minus, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import type {
	UseFormRegister,
	UseFieldArrayReturn,
	UseFormSetValue,
	UseFormGetValues
} from 'react-hook-form'

interface InvoiceItem {
	id: string
	description: string
	quantity: number
	unitPrice: number
	total: number
}

import type { CustomerInvoiceForm } from '@tenantflow/shared/types/invoice-lead'

interface InvoiceItemsSectionProps {
register: UseFormRegister<CustomerInvoiceForm>
fields: InvoiceItem[]
append: UseFieldArrayReturn<CustomerInvoiceForm, 'items'>['append']
remove: UseFieldArrayReturn<CustomerInvoiceForm, 'items'>['remove']
setValue: UseFormSetValue<CustomerInvoiceForm>
getValues: UseFormGetValues<CustomerInvoiceForm>
watchedItems: InvoiceItem[]
subtotal: number
taxAmount: number
total: number
autoTaxRate: number
clientState: string
formatCurrency: (amount: number) => string
}

export function InvoiceItemsSection({
	register,
	fields,
	append,
	remove,
	setValue,
	getValues,
	watchedItems,
	subtotal,
	taxAmount,
	total,
	autoTaxRate,
	clientState,
	formatCurrency
}: InvoiceItemsSectionProps) {
	return (
		<Card className="group bg-card/80 flex flex-1 flex-col border-0 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl">
			<CardHeader className="from-primary/5 to-accent/5 border-border/50 flex items-center justify-center border-b bg-gradient-to-r py-4">
				<CardTitle className="text-foreground flex items-center justify-center gap-2 text-base">
					<div className="bg-primary/10 group-hover:bg-primary/20 rounded-lg p-1.5 transition-colors">
						<FileText className="text-primary h-4 w-4" />
					</div>
					<span className="font-serif">Invoice Items</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-1 flex-col py-6">
				{/* Column Headers */}
				<div className="mb-4 grid grid-cols-12 gap-2 border-b pb-2">
					<div className="text-muted-foreground col-span-5 text-sm font-medium">
						Description
					</div>
					<div className="text-muted-foreground col-span-3 text-center text-sm font-medium">
						Qty
					</div>
					<div className="text-muted-foreground col-span-2 text-center text-sm font-medium">
						Price
					</div>
					<div className="text-muted-foreground col-span-2 text-center text-sm font-medium">
						Total
					</div>
				</div>

				{/* Invoice Items */}
				<div className="flex flex-col gap-3">
					{fields.map((field, index) => (
						<div
							key={field.id}
							className="grid grid-cols-12 items-center gap-2"
						>
							<div className="col-span-5">
								<Input
									{...register(`items.${index}.description`)}
									placeholder="Description of service/product"
									className="h-10 text-sm"
								/>
							</div>
							<div className="col-span-3">
								<div className="flex items-center justify-center gap-1">
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => {
											const currentQty =
												getValues(
													`items.${index}.quantity`
												) || 0
											if (currentQty > 1) {
												setValue(
													`items.${index}.quantity`,
													currentQty - 1
												)
											} else {
												remove(index)
											}
										}}
										className="h-10 w-10 p-0"
									>
										<Minus className="h-4 w-4" />
									</Button>
									<div className="w-16 text-center text-sm font-medium">
										{watchedItems[index]?.quantity || 0}
									</div>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => {
											const currentQty =
												getValues(
													`items.${index}.quantity`
												) || 0
											setValue(
												`items.${index}.quantity`,
												currentQty + 1
											)
										}}
										className="h-10 w-10 p-0"
									>
										<Plus className="h-4 w-4" />
									</Button>
								</div>
							</div>
							<div className="col-span-2">
								<Input
									type="number"
									step="0.01"
									min="0"
									{...register(`items.${index}.unitPrice`, {
										valueAsNumber: true
									})}
									placeholder="0.00"
									className="h-10 text-center text-sm"
								/>
							</div>
							<div className="col-span-2">
								<div className="bg-muted/50 flex h-10 items-center justify-center rounded-md text-sm font-medium">
									$
									{formatCurrency(
										(Number(
											watchedItems[index]?.quantity
										) || 0) *
											(Number(
												watchedItems[index]?.unitPrice
											) || 0)
									)}
								</div>
							</div>
						</div>
					))}
				</div>

				{/* Add Item Button - Aligned with quantity controls */}
				<div className="mt-6">
					<div className="grid grid-cols-12 gap-2">
						<div className="col-span-5"></div>
						<div className="col-span-3 flex justify-center">
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() =>
									append({
										id: Date.now().toString(),
										description: '',
										quantity: 1,
										unitPrice: 0,
										total: 0
									} as { id: string; description: string; quantity: number; unitPrice: number; total: number })
								}
								className="bg-primary/10 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground h-10 w-full max-w-[140px] transition-colors"
							>
								<div className="flex items-center gap-2">
									<Plus className="h-4 w-4" />
									<span>Add Item</span>
								</div>
							</Button>
						</div>
						<div className="col-span-4"></div>
					</div>
				</div>

				{/* Totals Section */}
				<div className="border-border/50 bg-muted/30 mt-auto rounded-lg border-t p-4 pt-6">
					<div className="space-y-3">
						<div className="flex justify-between text-base">
							<span>Subtotal:</span>
							<span className="font-medium">
								${formatCurrency(subtotal)}
							</span>
						</div>

						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className="text-base">
									Tax ({autoTaxRate}%):
								</span>
								{clientState && clientState.length === 2 && (
									<span className="text-sm font-medium text-green-600">
										{clientState.toUpperCase()}
									</span>
								)}
							</div>
							<span className="text-base font-medium">
								${formatCurrency(taxAmount)}
							</span>
						</div>

						<Separator className="my-3" />

						<div className="text-primary flex justify-between text-xl font-bold">
							<span>Total:</span>
							<span>${formatCurrency(total)}</span>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
