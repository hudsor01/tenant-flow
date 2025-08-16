import type {
	CustomerInvoiceForm,
	InvoiceItemForm as InvoiceItem
} from '@repo/shared'
import jsPDF from 'jspdf'
import { format } from 'date-fns'

// Enhanced PDF generation with lead magnet features
export const generateInvoicePDF = (invoice: CustomerInvoiceForm): Blob => {
	const doc = new jsPDF()

	// Use invoice directly (already normalized)
	const normalizedInvoice = invoice

	// Set up styling
	doc.setFont('helvetica')
	const primaryColor: [number, number, number] = [44, 62, 80] // Dark blue
	const accentColor: [number, number, number] = [52, 152, 219] // Blue
	const grayColor: [number, number, number] = [149, 165, 166] // Gray
	const greenColor: [number, number, number] = [46, 204, 113] // Success green

	// Header with TenantFlow Branding
	doc.setFontSize(28)
	doc.setTextColor(...primaryColor)
	doc.text('INVOICE', 20, 30)

	// TenantFlow Brand
	doc.setFontSize(12)
	doc.setTextColor(...accentColor)
	doc.text('Powered by TenantFlow', 20, 42)

	// Add  accent line
	doc.setDrawColor(...accentColor)
	doc.setLineWidth(2)
	doc.line(20, 48, 190, 48)

	// Invoice details in styled box
	const rightCol = 130

	// Invoice info box background
	doc.setFillColor(248, 249, 250)
	doc.rect(rightCol - 5, 20, 65, 40, 'F')

	doc.setFontSize(11)
	doc.setTextColor(0, 0, 0)
	doc.text(`Invoice #: ${normalizedInvoice.invoiceNumber}`, rightCol, 32)
	doc.text(
		`Issue Date: ${format(normalizedInvoice.issueDate, 'MMM dd, yyyy')}`,
		rightCol,
		42
	)
	doc.text(
		`Due Date: ${format(normalizedInvoice.dueDate, 'MMM dd, yyyy')}`,
		rightCol,
		52
	)

	// Status badge (if available)
	if ('status' in invoice && invoice.status) {
		let badgeColor: [number, number, number] = grayColor
		if (invoice.status === 'PAID') badgeColor = greenColor
		if (invoice.status === 'OVERDUE') badgeColor = [231, 76, 60]

		doc.setFillColor(...badgeColor)
		doc.rect(rightCol, 56, 25, 6, 'F')
		doc.setTextColor(255, 255, 255)
		doc.setFontSize(8)
		doc.text(invoice.status, rightCol + 2, 60)
		doc.setTextColor(0, 0, 0)
	}

	// Business information (From)
	let yPos = 75
	doc.setFontSize(14)
	doc.setTextColor(...accentColor)
	doc.text('From:', 20, yPos)

	doc.setFontSize(11)
	doc.setTextColor(0, 0, 0)
	yPos += 10
	doc.setFont('helvetica', 'bold')
	doc.text(normalizedInvoice.businessName, 20, yPos)
	doc.setFont('helvetica', 'normal')

	if (normalizedInvoice.businessEmail) {
		yPos += 7
		doc.text(normalizedInvoice.businessEmail, 20, yPos)
	}

	if (normalizedInvoice.businessAddress) {
		yPos += 7
		doc.text(normalizedInvoice.businessAddress, 20, yPos)

		const cityStateZip = [
			normalizedInvoice.businessCity,
			normalizedInvoice.businessState,
			normalizedInvoice.businessZip
		]
			.filter(Boolean)
			.join(' ')

		if (cityStateZip) {
			yPos += 7
			doc.text(cityStateZip, 20, yPos)
		}
	}

	if (normalizedInvoice.businessPhone) {
		yPos += 7
		doc.text(normalizedInvoice.businessPhone, 20, yPos)
	}

	// Client information (To)
	yPos = 75
	doc.setFontSize(14)
	doc.setTextColor(...accentColor)
	doc.text('To:', rightCol, yPos)

	doc.setFontSize(11)
	doc.setTextColor(0, 0, 0)
	yPos += 10
	doc.setFont('helvetica', 'bold')
	doc.text(normalizedInvoice.clientName, rightCol, yPos)
	doc.setFont('helvetica', 'normal')

	if (normalizedInvoice.clientEmail) {
		yPos += 7
		doc.text(normalizedInvoice.clientEmail, rightCol, yPos)
	}

	if (normalizedInvoice.clientAddress) {
		yPos += 7
		doc.text(normalizedInvoice.clientAddress, rightCol, yPos)

		const clientCityStateZip = [
			normalizedInvoice.clientCity,
			normalizedInvoice.clientState,
			normalizedInvoice.clientZip
		]
			.filter(Boolean)
			.join(' ')

		if (clientCityStateZip) {
			yPos += 7
			doc.text(clientCityStateZip, rightCol, yPos)
		}
	}

	// Line items table
	yPos = 140

	// Table header with  styling
	doc.setFillColor(...accentColor)
	doc.rect(20, yPos - 8, 170, 12, 'F')

	doc.setTextColor(255, 255, 255)
	doc.setFontSize(10)
	doc.setFont('helvetica', 'bold')
	doc.text('Description', 25, yPos - 2)
	doc.text('Qty', 120, yPos - 2)
	doc.text('Rate', 140, yPos - 2)
	doc.text('Amount', 165, yPos - 2)

	doc.setFont('helvetica', 'normal')
	doc.setTextColor(0, 0, 0)
	yPos += 10

	// Table rows with alternating background
	normalizedInvoice.items.forEach((item: InvoiceItem, index: number) => {
		if (index % 2 === 0) {
			doc.setFillColor(248, 249, 250)
			doc.rect(20, yPos - 6, 170, 10, 'F')
		}

		// Wrap long descriptions
		const maxDescWidth = 90
		const splitDesc = doc.splitTextToSize(item.description, maxDescWidth)
		const descHeight = splitDesc.length * 4

		doc.text(splitDesc, 25, yPos)
		doc.text(item.quantity.toString(), 120, yPos)
		doc.text(`$${item.unitPrice?.toFixed(2) || '0.00'}`, 140, yPos)
		doc.text(
			`$${((item.quantity || 0) * (item.unitPrice || 0)).toFixed(2)}`,
			165,
			yPos
		)

		yPos += Math.max(10, descHeight + 2)
	})

	// Totals section with  styling
	yPos += 15
	const totalsX = 120

	// Background for totals
	doc.setFillColor(248, 249, 250)
	doc.rect(totalsX - 5, yPos - 5, 75, 40, 'F')

	// Subtotal
	doc.setFontSize(10)
	doc.text('Subtotal:', totalsX, yPos)
	doc.text(`$${normalizedInvoice.subtotal?.toFixed(2) || '0.00'}`, 165, yPos)

	// Tax (if applicable)
	if ((normalizedInvoice.taxRate || 0) > 0) {
		yPos += 8
		doc.text(`Tax (${normalizedInvoice.taxRate}%):`, totalsX, yPos)
		doc.text(
			`$${normalizedInvoice.taxAmount?.toFixed(2) || '0.00'}`,
			165,
			yPos
		)
	}

	// Total with emphasis
	yPos += 12
	doc.setFontSize(14)
	doc.setFont('helvetica', 'bold')
	doc.setTextColor(...primaryColor)
	doc.text('TOTAL:', totalsX, yPos)
	doc.text(`$${normalizedInvoice.total?.toFixed(2) || '0.00'}`, 165, yPos)

	doc.setFont('helvetica', 'normal')
	doc.setTextColor(0, 0, 0)

	// Notes section
	if (normalizedInvoice.notes) {
		yPos += 25
		doc.setFontSize(12)
		doc.setTextColor(...accentColor)
		doc.setFont('helvetica', 'bold')
		doc.text('Notes:', 20, yPos)

		doc.setFont('helvetica', 'normal')
		doc.setFontSize(10)
		doc.setTextColor(0, 0, 0)
		yPos += 8

		const splitNotes = doc.splitTextToSize(normalizedInvoice.notes, 170)
		doc.text(splitNotes, 20, yPos)
		yPos += splitNotes.length * 5
	}

	// Terms section
	if (normalizedInvoice.terms) {
		yPos += 10
		doc.setFontSize(12)
		doc.setTextColor(...accentColor)
		doc.setFont('helvetica', 'bold')
		doc.text('Terms & Conditions:', 20, yPos)

		doc.setFont('helvetica', 'normal')
		doc.setFontSize(10)
		doc.setTextColor(0, 0, 0)
		yPos += 8

		const splitTerms = doc.splitTextToSize(normalizedInvoice.terms, 170)
		doc.text(splitTerms, 20, yPos)
	}

	// Enhanced branding footer for marketing
	const isProVersion =
		'isProVersion' in invoice ? invoice.isProVersion : false
	if (!isProVersion) {
		//  branding section
		doc.setFontSize(9)
		doc.setTextColor(...primaryColor)
		doc.text('TenantFlow Invoice Generator', 20, 275)

		doc.setFontSize(8)
		doc.setTextColor(...grayColor)
		doc.text(
			' invoicing made simple. Create, customize, and get paid faster.',
			20,
			282
		)

		// Marketing CTA
		doc.setTextColor(...accentColor)
		doc.text(
			'Upgrade to Pro: Remove watermarks + Advanced features | tenantflow.app/pricing',
			20,
			289
		)
	}

	return doc.output('blob')
}

export const previewInvoicePDF = (invoice: CustomerInvoiceForm): string => {
	const pdfBlob = generateInvoicePDF(invoice)
	return URL.createObjectURL(pdfBlob)
}
