import React, { useEffect, useMemo, useState } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { CustomerInvoice } from '@/types/invoice'
import type { UseFormRegister, FieldErrors } from 'react-hook-form'
import { generateInvoicePDF } from '@/lib/invoice-pdf'

// Import all the individual components
import { InvoiceHeader } from '@/components/invoice/InvoiceHeader'
import { InvoiceDetails } from '@/components/invoice/InvoiceDetails'
import { BusinessInfoSection } from '@/components/invoice/BusinessInfoSection'
import { ClientInfoSection } from '@/components/invoice/ClientInfoSection'
import { InvoiceItemsSection } from '@/components/invoice/InvoiceItemsSection'
import { InvoiceActions } from '@/components/invoice/InvoiceActions'
import { EmailModal } from '@/components/invoice/EmailModal'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const InvoiceGeneratorPage: React.FC = () => {
	const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)

const form = useForm<CustomerInvoice>({
defaultValues: {
			invoiceNumber: `INV-${Date.now()}`,
			issueDate: new Date(),
			dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
			status: 'DRAFT' as const,
			businessName: '',
			businessEmail: '',
			businessAddress: '',
			businessCity: '',
			businessState: '',
			businessZip: '',
			businessPhone: '',
			clientName: '',
			clientEmail: '',
			clientAddress: '',
			clientCity: '',
			clientState: '',
			clientZip: '',
			items: [
				{
					id: '1',
					description: '',
					quantity: 1,
					unitPrice: 0,
					total: 0
				}
			],
			notes: 'Thank you for your business!',
			terms: 'Payment is due within 30 days.',
			subtotal: 0,
			taxRate: 0,
			taxAmount: 0,
			total: 0,
			downloadCount: 0,
			isProVersion: false
		}
	})

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: 'items'
	})

	const watchedItems = form.watch('items')

	// Calculate totals
	const subtotal =
		watchedItems?.reduce((sum, item) => {
			const qty = Number(item?.quantity) || 0
			const rate = Number(item?.unitPrice) || 0
			return sum + qty * rate
		}, 0) || 0

	// US State Tax Rates (2024)
	const stateTaxRates: Record<string, number> = useMemo(
		() => ({
			AL: 4.0,
			AK: 0.0,
			AZ: 5.6,
			AR: 6.5,
			CA: 7.25,
			CO: 2.9,
			CT: 6.35,
			DE: 0.0,
			FL: 6.0,
			GA: 4.0,
			HI: 4.17,
			ID: 6.0,
			IL: 6.25,
			IN: 7.0,
			IA: 6.0,
			KS: 6.5,
			KY: 6.0,
			LA: 4.45,
			ME: 5.5,
			MD: 6.0,
			MA: 6.25,
			MI: 6.0,
			MN: 6.88,
			MS: 7.0,
			MO: 4.23,
			MT: 0.0,
			NE: 5.5,
			NV: 6.85,
			NH: 0.0,
			NJ: 6.63,
			NM: 5.13,
			NY: 4.0,
			NC: 4.75,
			ND: 5.0,
			OH: 5.75,
			OK: 4.5,
			OR: 0.0,
			PA: 6.0,
			RI: 7.0,
			SC: 6.0,
			SD: 4.2,
			TN: 7.0,
			TX: 6.25,
			UT: 6.1,
			VT: 6.0,
			VA: 5.3,
			WA: 6.5,
			WV: 6.0,
			WI: 5.0,
			WY: 4.0,
			DC: 6.0
		}),
		[]
	)

	const clientState = form.watch('clientState')
	const autoTaxRate =
		clientState && clientState.length === 2
			? stateTaxRates[clientState.toUpperCase()] || 0
			: 0

	const taxAmount = subtotal * (autoTaxRate / 100)
	const total = subtotal + taxAmount

	// Auto-calculate tax rate based on client state
	useEffect(() => {
		if (clientState && clientState.length === 2) {
			const stateCode = clientState.toUpperCase()
			const taxRate = stateTaxRates[stateCode]
			if (taxRate !== undefined) {
				form.setValue('taxRate', taxRate, {
					shouldValidate: false,
					shouldDirty: false
				})
			}
		}
	}, [clientState, form, stateTaxRates])

	// Number formatting function
	const formatCurrency = (amount: number): string => {
		return new Intl.NumberFormat('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		}).format(amount)
	}

	const handleGenerateInvoice = async () => {
		try {
			const isValid = await form.trigger()

			if (!isValid) {
				toast.error(
					'Please fix the validation errors before generating invoice'
				)
				return
			}

			const formData = form.getValues() as CustomerInvoice

			if (!clientState || clientState.length !== 2) {
				toast.error(
					'Valid client state is required for tax calculation'
				)
				return
			}

			if (!stateTaxRates[clientState.toUpperCase()]) {
				toast.error(
					'Invalid state code. Please enter a valid US state abbreviation.'
				)
				return
			}

			const invoiceData = {
				...formData,
				subtotal,
				taxAmount,
				total,
				taxRate: autoTaxRate,
				clientState: clientState.toUpperCase()
			}

			const pdfBlob = generateInvoicePDF(invoiceData)

			const url = URL.createObjectURL(pdfBlob)
			const link = document.createElement('a')
			link.href = url
			link.download = `invoice-${formData.invoiceNumber}.pdf`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			URL.revokeObjectURL(url)

			toast.success('Invoice generated successfully!')
		} catch (error) {
			toast.error('Failed to generate invoice')
			console.error(error)
		}
	}

	const handlePreview = () => {
		const formData = form.getValues() as CustomerInvoice
		try {
			const invoiceData = {
				...formData,
				subtotal,
				taxAmount,
				total
			}

			const pdfBlob = generateInvoicePDF(invoiceData)
			const url = URL.createObjectURL(pdfBlob)
			window.open(url, '_blank')
			URL.revokeObjectURL(url)
		} catch {
			toast.error('Failed to generate preview')
		}
	}

	const handlePrepareEmail = () => {
		setIsEmailModalOpen(true)
	}

	const handleSendEmail = async (emailData: {
		to: string
		subject: string
		message: string
	}) => {
		try {
			const formData = form.getValues() as CustomerInvoice
			const invoiceData = {
				...formData,
				subtotal,
				taxAmount,
				total,
				taxRate: autoTaxRate,
				clientState: clientState?.toUpperCase()
			}

			const pdfBlob = generateInvoicePDF(invoiceData)

			// Download PDF and open email client
			const url = URL.createObjectURL(pdfBlob)
			const link = document.createElement('a')
			link.href = url
			link.download = `invoice-${formData.invoiceNumber}.pdf`
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
			URL.revokeObjectURL(url)

			// Open email client
			const subject = encodeURIComponent(emailData.subject)
			const body = encodeURIComponent(emailData.message)
			window.location.href = `mailto:${emailData.to}?subject=${subject}&body=${body}`

			toast.success('PDF downloaded! Email client opened.')
		} catch (error) {
			toast.error('Failed to prepare email')
			console.error(error)
		}
	}

	return (
		<div className="bg-background relative min-h-screen overflow-hidden">
			{/* Background Pattern */}
			<div className="from-primary/5 via-background to-accent/10 absolute inset-0 bg-gradient-to-br" />
			<div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23f8fafc%22%20fill-opacity%3D%220.3%22%3E%3Ccircle%20cx%3D%227%22%20cy%3D%227%22%20r%3D%221%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

			<div className="relative container mx-auto px-8 py-12">
				<InvoiceHeader />

				<div className="mx-auto mb-12">
					{/* First Row: From Business + Invoice Details */}
					<div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
<BusinessInfoSection
register={form.register as UseFormRegister<CustomerInvoice>}
errors={form.formState.errors as FieldErrors<CustomerInvoice>}
/>
						<InvoiceDetails register={form.register} />
					</div>

					{/* Second Row: To Client + Invoice Items + Notes */}
					<div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
						{/* Left Column - To Client + Notes */}
						<div className="flex h-full flex-col gap-6">
<ClientInfoSection
register={form.register}
errors={form.formState.errors as FieldErrors<CustomerInvoice>}
clientState={clientState ?? ''}
autoTaxRate={autoTaxRate}
stateTaxRates={stateTaxRates}
/>

							{/* Notes Section in Left Column */}
							<div className="bg-card/80 border-border/50 flex-1 rounded-lg border p-8 shadow-lg backdrop-blur-sm">
								<Label
									htmlFor="notes"
									className="text-foreground mb-3 block text-lg font-semibold"
								>
									Notes
								</Label>
								<Textarea
									id="notes"
									{...form.register('notes')}
									placeholder="Thank you for your business! Please feel free to add any additional notes or special instructions here."
									rows={4}
									className="resize-none text-base"
								/>
							</div>
						</div>

						{/* Right Column - Invoice Items */}
						<InvoiceItemsSection
							register={form.register}
							fields={fields}
							append={append}
							remove={remove}
							setValue={form.setValue}
							getValues={form.getValues}
							watchedItems={watchedItems}
							subtotal={subtotal}
							taxAmount={taxAmount}
							total={total}
							autoTaxRate={autoTaxRate}
							formatCurrency={formatCurrency} clientState={''}						/>
					</div>
				</div>

				{/* Centered CTA Buttons */}
				<div className="mx-auto mb-8 flex justify-center">
					<InvoiceActions
						onGenerateInvoice={handleGenerateInvoice}
						onPreview={handlePreview}
						onPrepareEmail={handlePrepareEmail}
					/>
				</div>

				{/* Centered Upgrade CTA */}
				<div className="mx-auto mb-8 flex justify-center">
					<div className="from-primary/5 to-accent/5 border-primary/10 max-w-md rounded-xl border bg-gradient-to-r p-6 text-center shadow-lg">
						<p className="text-muted-foreground mb-4 text-lg">
							✨ Want to remove the watermark and unlock premium
							features?
						</p>
						<Button
							variant="ghost"
							size="lg"
							className="text-primary hover:text-primary-foreground hover:bg-primary px-8 py-3 font-semibold"
						>
							Upgrade to TenantFlow Pro →
						</Button>
					</div>
				</div>
			</div>

			<EmailModal
				isOpen={isEmailModalOpen}
				onClose={() => setIsEmailModalOpen(false)}
				onSend={handleSendEmail}
				defaultTo={form.getValues('clientEmail')}
				defaultSubject={`Invoice ${form.getValues('invoiceNumber')} from ${form.getValues('businessName')}`}
				defaultMessage={`Hi ${form.getValues('clientName') || 'there'},

Please find your invoice attached.

Thank you for your business!

Best regards,
${form.getValues('businessName') || 'Your Business'}`}
			/>
		</div>
	)
}

export default InvoiceGeneratorPage
