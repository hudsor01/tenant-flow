/* eslint-disable color-tokens/no-hex-colors -- Static HTML served to StirlingPDF (third-party PDF renderer); Tailwind design tokens don't resolve in this rendering context. */

import type { MaintenanceRequest } from '#types/core'

interface WorkOrderExpense {
	vendor_name: string
	amount: string
	expense_date: string
}

interface WorkOrderInput {
	request: MaintenanceRequest
	propertyName: string | null
	unitNumber: string | null
	expenses: WorkOrderExpense[]
	totalExpenses: string
}

function escapeHtml(text: string | null | undefined): string {
	if (text === null || text === undefined) return ''
	return String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
}

function formatDate(iso: string | null | undefined): string {
	if (!iso) return '—'
	try {
		return new Date(iso).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		})
	} catch {
		return '—'
	}
}

/**
 * Build printable work-order HTML for the generate-pdf Edge Function.
 *
 * StirlingPDF (the downstream renderer) doesn't understand Tailwind CSS
 * variables, so we use static hex colors here. Hex colors are file-level
 * eslint-disabled above, consistent with rent-increase-notice-dialog.tsx.
 */
export function buildWorkOrderHtml(input: WorkOrderInput): string {
	const { request, propertyName, unitNumber, expenses, totalExpenses } = input
	const hasExpenses = expenses.length > 0

	const expenseRows = expenses
		.map(
			e => `<tr>
  <td>${escapeHtml(formatDate(e.expense_date))}</td>
  <td>${escapeHtml(e.vendor_name)}</td>
  <td style="text-align:right;">${escapeHtml(e.amount)}</td>
</tr>`
		)
		.join('')

	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Work Order — ${escapeHtml(request.id.slice(0, 8))}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; margin: 48px; color: #222; line-height: 1.5; }
    h1 { font-size: 22px; margin-bottom: 4px; border-bottom: 2px solid #222; padding-bottom: 8px; }
    .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px 32px; margin-bottom: 24px; }
    .field-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-bottom: 2px; }
    .field-value { font-size: 14px; color: #222; }
    .section-title { font-size: 14px; font-weight: 600; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.05em; color: #444; }
    .description { background: #f4f4f4; padding: 12px 16px; border-radius: 4px; font-size: 14px; white-space: pre-wrap; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th { border-bottom: 2px solid #222; padding: 8px; text-align: left; background: #f4f4f4; }
    td { border-bottom: 1px solid #ddd; padding: 8px; }
    tfoot td { font-weight: 600; border-top: 2px solid #222; border-bottom: none; }
    .signature { margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
    .signature-line { border-top: 1px solid #444; padding-top: 4px; font-size: 12px; color: #444; }
  </style>
</head>
<body>
  <h1>Work Order</h1>
  <p class="meta">
    Request ID: ${escapeHtml(request.id)} · Printed ${escapeHtml(new Date().toLocaleDateString())}
  </p>

  <div class="grid">
    <div>
      <div class="field-label">Title</div>
      <div class="field-value">${escapeHtml(request.title ?? request.description ?? '—')}</div>
    </div>
    <div>
      <div class="field-label">Status</div>
      <div class="field-value">${escapeHtml(request.status ?? '—')}</div>
    </div>
    <div>
      <div class="field-label">Priority</div>
      <div class="field-value">${escapeHtml(request.priority ?? '—')}</div>
    </div>
    <div>
      <div class="field-label">Property</div>
      <div class="field-value">${escapeHtml(propertyName ?? '—')}</div>
    </div>
    <div>
      <div class="field-label">Unit</div>
      <div class="field-value">${escapeHtml(unitNumber ?? '—')}</div>
    </div>
    <div>
      <div class="field-label">Reported</div>
      <div class="field-value">${escapeHtml(formatDate(request.created_at))}</div>
    </div>
    <div>
      <div class="field-label">Scheduled</div>
      <div class="field-value">${escapeHtml(formatDate(request.scheduled_date))}</div>
    </div>
    <div>
      <div class="field-label">Completed</div>
      <div class="field-value">${escapeHtml(formatDate(request.completed_at))}</div>
    </div>
    <div>
      <div class="field-label">Assigned to</div>
      <div class="field-value">${escapeHtml(request.assigned_to ?? '—')}</div>
    </div>
  </div>

  <div class="section-title">Description</div>
  <div class="description">${escapeHtml(request.description ?? '—')}</div>

  ${
		hasExpenses
			? `<div class="section-title">Expenses</div>
  <table>
    <thead>
      <tr><th>Date</th><th>Vendor</th><th style="text-align:right;">Amount</th></tr>
    </thead>
    <tbody>${expenseRows}</tbody>
    <tfoot>
      <tr>
        <td colspan="2">Total</td>
        <td style="text-align:right;">${escapeHtml(totalExpenses)}</td>
      </tr>
    </tfoot>
  </table>`
			: ''
	}

  <div class="signature">
    <div class="signature-line">Vendor signature / date</div>
    <div class="signature-line">Property owner signature / date</div>
  </div>
</body>
</html>`
}
