/**
 * Payment date utilities
 *
 * Provides canonical logic for determining payment receipt dates
 * across the application for consistency.
 */

/**
 * Canonical payment receipt date rule:
 * Use paid_date when available and payment status is successful, fallback to created_at
 *
 * @param paidDate - The paid_date from the payment record (can be null)
 * @param createdAt - The created_at timestamp from the payment record
 * @param status - The payment status
 * @returns The canonical payment date as an ISO string
 */
export function getCanonicalPaymentDate(
	paidDate: string | null,
	createdAt: string,
	status: string
): string {
	// Use paid_date when available and payment status indicates success
	if (paidDate && isSuccessfulPaymentStatus(status)) {
		return paidDate
	}

	// Fallback to created_at
	return createdAt
}

/**
 * Check if a payment status indicates a successful payment
 * @param status - The payment status string
 * @returns true if the payment is considered successful
 */
export function isSuccessfulPaymentStatus(status: string): boolean {
	const successfulStatuses = ['SUCCEEDED', 'PAID', 'COMPLETED']
	return successfulStatuses.includes(status.toUpperCase())
}

/**
 * Validate that a payment date is reasonable
 * @param paymentDate - The payment date to validate
 * @param leaseStartDate - The lease start date for context
 * @param leaseEndDate - The lease end date for context
 * @returns true if the date is reasonable
 */
export function isValidPaymentDate(
	paymentDate: string,
	leaseStartDate: string,
	leaseEndDate: string
): boolean {
	const payment = new Date(paymentDate)
	const leaseStart = new Date(leaseStartDate)
	const leaseEnd = new Date(leaseEndDate)
	const now = new Date()

	// Payment date should not be in the future
	if (payment > now) {
		return false
	}

	// Payment date should be within lease period (with some buffer)
	const leaseStartBuffer = new Date(leaseStart)
	leaseStartBuffer.setMonth(leaseStartBuffer.getMonth() - 1) // 1 month before lease start

	const leaseEndBuffer = new Date(leaseEnd)
	leaseEndBuffer.setMonth(leaseEndBuffer.getMonth() + 1) // 1 month after lease end

	if (payment < leaseStartBuffer || payment > leaseEndBuffer) {
		return false
	}

	return true
}