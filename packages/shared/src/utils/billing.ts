/**
 * Billing utility functions
 * Helper functions for subscription calculations and plan management
 */

import { BILLING_PLANS, type PlanType, type BillingPlan } from '../constants/billing.js'

export function getPlanById(planId: string): BillingPlan | undefined {
	return BILLING_PLANS[planId as PlanType]
}

export function calculateProratedAmount(
	amount: number,
	daysRemaining: number,
	daysInPeriod: number
): number {
	return Math.round((amount * daysRemaining) / daysInPeriod)
}

export function calculateAnnualPrice(monthlyPrice: number): number {
	// 10% discount for annual billing
	return Math.round(monthlyPrice * 12 * 0.9)
}

export function calculateAnnualSavings(monthlyPrice: number): number {
	const yearlyWithoutDiscount = monthlyPrice * 12
	const yearlyWithDiscount = calculateAnnualPrice(monthlyPrice)
	return yearlyWithoutDiscount - yearlyWithDiscount
}

export const SUBSCRIPTION_URLS = {
	MANAGE: '/manage/subscription',
	UPGRADE: '/manage/subscription/upgrade',
	CANCEL: '/manage/subscription/cancel',
	PORTAL: '/manage/billing-portal',
	dashboardWithTrial: '/manage?trial=success',
	dashboardWithSetup: '/manage?setup=complete'
} as const
