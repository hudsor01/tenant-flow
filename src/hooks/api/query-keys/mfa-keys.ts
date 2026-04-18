/**
 * MFA Query Keys & Options
 * queryOptions() factories for multi-factor authentication domain.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'

/**
 * MFA Status response
 */
export interface MfaStatus {
	currentLevel: 'aal1' | 'aal2'
	nextLevel: 'aal1' | 'aal2'
	isMfaEnabled: boolean
	requiresMfaVerification: boolean
}

/**
 * Enrolled TOTP factor
 */
export interface EnrolledFactor {
	id: string
	type: 'totp' | 'phone'
	friendlyName: string | undefined
	status: 'verified' | 'unverified'
	createdAt: string
	updatedAt: string
}

export const mfaKeys = {
	all: ['mfa'] as const,
	factors: () => [...mfaKeys.all, 'factors'] as const,
	status: () => [...mfaKeys.all, 'status'] as const
}

export const mfaQueries = {
	/**
	 * Get current MFA status and assurance level
	 */
	status: () =>
		queryOptions({
			queryKey: mfaKeys.status(),
			queryFn: async (): Promise<MfaStatus> => {
				const supabase = createClient()
				const { data, error } =
					await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

				if (error) throw error

				return {
					currentLevel: data.currentLevel ?? 'aal1',
					nextLevel: data.nextLevel ?? 'aal1',
					isMfaEnabled: data.nextLevel === 'aal2',
					requiresMfaVerification:
						data.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
				}
			},
			staleTime: 30 * 1000 // 30 seconds
		}),

	/**
	 * List enrolled MFA factors
	 */
	factors: () =>
		queryOptions({
			queryKey: mfaKeys.factors(),
			queryFn: async (): Promise<EnrolledFactor[]> => {
				const supabase = createClient()
				const { data, error } = await supabase.auth.mfa.listFactors()

				if (error) throw error

				const factors: EnrolledFactor[] = []

				// Add TOTP factors
				if (data.totp) {
					for (const factor of data.totp) {
						factors.push({
							id: factor.id,
							type: 'totp',
							friendlyName: factor.friendly_name ?? undefined,
							status: factor.status as 'verified' | 'unverified',
							createdAt: factor.created_at,
							updatedAt: factor.updated_at
						})
					}
				}

				// Add phone factors if any
				if (data.phone) {
					for (const factor of data.phone) {
						factors.push({
							id: factor.id,
							type: 'phone',
							friendlyName: factor.friendly_name ?? undefined,
							status: factor.status as 'verified' | 'unverified',
							createdAt: factor.created_at,
							updatedAt: factor.updated_at
						})
					}
				}

				return factors
			},
			staleTime: 60 * 1000 // 1 minute
		})
}
