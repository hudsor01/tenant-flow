/**
 * Late Fees API Client
 * Phase 6.1: Late Fee System
 */

import { apiClient } from '@repo/shared/utils/api-client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ''

export interface LateFeeConfig {
	leaseId: string
	gracePeriodDays: number
	flatFeeAmount: number
}

export interface LateFeeCalculation {
	rentAmount: number
	daysLate: number
	gracePeriod: number
	lateFeeAmount: number
	shouldApplyFee: boolean
	reason: string
}

export interface OverduePayment {
	id: string
	amount: number
	dueDate: string
	daysOverdue: number
	lateFeeApplied: boolean
}

export interface ProcessLateFeesResult {
	processed: number
	totalLateFees: number
	details: Array<{
		paymentId: string
		lateFeeAmount: number
		daysOverdue: number
	}>
}

export interface ApplyLateFeeResult {
	invoiceItemId: string
	amount: number
	paymentId: string
}

export const lateFeesApi = {
	/**
	 * Get late fee configuration for a lease
	 */
	getConfig: async (leaseId: string): Promise<LateFeeConfig> => {
		const response = await apiClient<{ success: boolean; data: LateFeeConfig }>(
			`${API_BASE_URL}/api/v1/late-fees/lease/${leaseId}/config`
		)
		return response.data
	},

	/**
	 * Update late fee configuration
	 */
	updateConfig: async (
		leaseId: string,
		gracePeriodDays?: number,
		flatFeeAmount?: number
	): Promise<void> => {
		await apiClient<{ success: boolean; message: string }>(
			`${API_BASE_URL}/api/v1/late-fees/lease/${leaseId}/config`,
			{
				method: 'PUT',
				body: JSON.stringify({
					gracePeriodDays,
					flatFeeAmount
				})
			}
		)
	},

	/**
	 * Calculate late fee for specific payment
	 */
	calculate: async (
		rentAmount: number,
		daysLate: number,
		leaseId?: string
	): Promise<LateFeeCalculation> => {
		const response = await apiClient<{
			success: boolean
			data: LateFeeCalculation
		}>(`${API_BASE_URL}/api/v1/late-fees/calculate`, {
			method: 'POST',
			body: JSON.stringify({
				rentAmount,
				daysLate,
				leaseId
			})
		})
		return response.data
	},

	/**
	 * Get overdue payments for a lease
	 */
	getOverduePayments: async (
		leaseId: string
	): Promise<{ payments: OverduePayment[]; gracePeriod: number }> => {
		const response = await apiClient<{
			success: boolean
			data: { payments: OverduePayment[]; gracePeriod: number }
		}>(`${API_BASE_URL}/api/v1/late-fees/lease/${leaseId}/overdue`)
		return response.data
	},

	/**
	 * Process late fees for all overdue payments
	 */
	processLateFees: async (leaseId: string): Promise<ProcessLateFeesResult> => {
		const response = await apiClient<{
			success: boolean
			data: ProcessLateFeesResult
			message: string
		}>(`${API_BASE_URL}/api/v1/late-fees/lease/${leaseId}/process`, {
			method: 'POST'
		})
		return response.data
	},

	/**
	 * Apply late fee to specific payment
	 */
	applyLateFee: async (
		paymentId: string,
		lateFeeAmount: number,
		reason: string
	): Promise<ApplyLateFeeResult> => {
		const response = await apiClient<{
			success: boolean
			data: ApplyLateFeeResult
			message: string
		}>(`${API_BASE_URL}/api/v1/late-fees/payment/${paymentId}/apply`, {
			method: 'POST',
			body: JSON.stringify({
				lateFeeAmount,
				reason
			})
		})
		return response.data
	}
}
