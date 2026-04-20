'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { FileText } from 'lucide-react'
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
import { Input } from '#components/ui/input'
import { Label } from '#components/ui/label'
import { Textarea } from '#components/ui/textarea'
import { callGeneratePdfFromHtml } from '#hooks/api/use-report-mutations'
import { formatCurrency } from '#lib/utils/currency'
import type { Lease } from '#types/core'

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

interface RentIncreaseNoticeDialogProps {
	lease: Lease
	tenantName: string | null
	propertyAddress: string | null
}

function buildNoticeHtml(params: {
	tenantName: string
	propertyAddress: string
	ownerName: string
	currentRent: number
	newRent: number
	effectiveDate: string
	reason: string
	noticeDate: string
}): string {
	const {
		tenantName,
		propertyAddress,
		ownerName,
		currentRent,
		newRent,
		effectiveDate,
		reason,
		noticeDate
	} = params
	const increase = newRent - currentRent
	const increasePercent =
		currentRent > 0 ? ((increase / currentRent) * 100).toFixed(1) : '0.0'

	const reasonBlock = reason.trim()
		? `<p><strong>Reason for increase:</strong> ${escapeHtml(reason)}</p>`
		: ''

	// eslint-disable-next-line color-tokens/no-hex-colors -- Static HTML for StirlingPDF (third-party PDF renderer); Tailwind tokens don't resolve in this context
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Rent Increase Notice</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 48px; color: #222; line-height: 1.6; }
    h1 { font-size: 22px; margin-bottom: 4px; border-bottom: 2px solid #222; padding-bottom: 8px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 32px; }
    .section { margin-bottom: 20px; font-size: 14px; }
    .rent-table { border-collapse: collapse; margin: 16px 0; font-size: 14px; }
    .rent-table td, .rent-table th { border: 1px solid #ccc; padding: 8px 16px; text-align: left; }
    .rent-table th { background: #f4f4f4; }
    .signature { margin-top: 64px; font-size: 13px; color: #444; }
    .signature-line { border-top: 1px solid #444; width: 280px; margin-top: 32px; padding-top: 4px; }
  </style>
</head>
<body>
  <h1>Notice of Rent Increase</h1>
  <p class="meta">Issued: ${escapeHtml(noticeDate)}</p>

  <div class="section">
    <p><strong>To:</strong> ${escapeHtml(tenantName)}</p>
    <p><strong>Property:</strong> ${escapeHtml(propertyAddress)}</p>
  </div>

  <div class="section">
    <p>
      Please be advised that, effective <strong>${escapeHtml(effectiveDate)}</strong>,
      the monthly rent for the above-referenced property will be adjusted as set out below.
    </p>
  </div>

  <table class="rent-table">
    <thead>
      <tr><th>Item</th><th>Amount</th></tr>
    </thead>
    <tbody>
      <tr><td>Current monthly rent</td><td>${escapeHtml(formatCurrency(currentRent))}</td></tr>
      <tr><td>New monthly rent</td><td>${escapeHtml(formatCurrency(newRent))}</td></tr>
      <tr><td>Increase</td><td>${escapeHtml(formatCurrency(increase))} (${escapeHtml(increasePercent)}%)</td></tr>
      <tr><td>Effective date</td><td>${escapeHtml(effectiveDate)}</td></tr>
    </tbody>
  </table>

  ${reasonBlock}

  <div class="section">
    <p>
      All other terms and conditions of your lease agreement remain unchanged.
      Please sign below to acknowledge receipt of this notice and retain a copy
      for your records.
    </p>
    <p>
      If you have questions about this notice, contact the property owner using
      the information provided with your lease.
    </p>
  </div>

  <div class="signature">
    <div class="signature-line">${escapeHtml(ownerName)} signature / date</div>
    <div class="signature-line">Tenant signature / date</div>
  </div>
</body>
</html>`
}

export function RentIncreaseNoticeDialog({
	lease,
	tenantName,
	propertyAddress
}: RentIncreaseNoticeDialogProps) {
	const [open, setOpen] = useState(false)
	const [newRent, setNewRent] = useState<string>('')
	const [effectiveDate, setEffectiveDate] = useState<string>('')
	const [reason, setReason] = useState<string>('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const currentRent = lease.rent_amount

	const handleGenerate = async () => {
		const parsedRent = Number(newRent)
		if (!Number.isFinite(parsedRent) || parsedRent <= 0) {
			toast.error('Enter a valid new monthly rent amount.')
			return
		}
		if (parsedRent <= currentRent) {
			toast.error('New rent must be higher than the current rent.')
			return
		}
		if (!effectiveDate) {
			toast.error('Choose an effective date for the increase.')
			return
		}

		setIsSubmitting(true)
		try {
			// Parse YYYY-MM-DD input as local time (appending T00:00:00) so that
			// landlords in negative-UTC-offset timezones don't see the PDF show
			// the previous calendar day. `new Date('2026-05-01')` is UTC midnight;
			// `new Date('2026-05-01T00:00:00')` is local midnight.
			const effectiveDateLocal = new Date(`${effectiveDate}T00:00:00`)
			const html = buildNoticeHtml({
				tenantName: tenantName ?? 'Tenant',
				propertyAddress: propertyAddress ?? 'Property',
				ownerName: 'Property Owner',
				currentRent,
				newRent: parsedRent,
				effectiveDate: effectiveDateLocal.toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				}),
				reason,
				noticeDate: new Date().toLocaleDateString('en-US', {
					year: 'numeric',
					month: 'long',
					day: 'numeric'
				})
			})
			await callGeneratePdfFromHtml(html, `rent-increase-notice-${lease.id.slice(0, 8)}.pdf`)
			toast.success('Notice generated', {
				description: 'Review the PDF and deliver it to your tenant.'
			})
			setOpen(false)
			setNewRent('')
			setEffectiveDate('')
			setReason('')
		} catch (error) {
			toast.error('Failed to generate notice', {
				description:
					error instanceof Error ? error.message : 'Please try again.'
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<FileText className="size-4 mr-2" />
					Rent increase notice
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Generate rent-increase notice</DialogTitle>
					<DialogDescription>
						Creates a printable PDF notice for this lease. Delivery and state-
						specific notice-period rules are your responsibility.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div className="rounded-md bg-muted px-3 py-2 text-sm">
						<span className="text-muted-foreground">Current rent: </span>
						<span className="font-semibold">{formatCurrency(currentRent)}</span>
					</div>
					<div className="space-y-2">
						<Label htmlFor="new-rent">New monthly rent</Label>
						<Input
							id="new-rent"
							type="number"
							min="1"
							step="0.01"
							inputMode="decimal"
							placeholder={String(currentRent)}
							value={newRent}
							onChange={e => setNewRent(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="effective-date">Effective date</Label>
						<Input
							id="effective-date"
							type="date"
							value={effectiveDate}
							onChange={e => setEffectiveDate(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="reason">Reason (optional)</Label>
						<Textarea
							id="reason"
							placeholder="e.g. Market rate adjustment, property tax increase..."
							value={reason}
							onChange={e => setReason(e.target.value)}
							rows={3}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button onClick={handleGenerate} disabled={isSubmitting}>
						{isSubmitting ? 'Generating...' : 'Generate PDF'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
