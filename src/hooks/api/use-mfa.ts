/**
 * MFA (Multi-Factor Authentication) Hooks
 * TanStack Query hooks for Supabase MFA TOTP operations
 *
 * @see https://supabase.com/docs/guides/auth/auth-mfa
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { toast } from 'sonner'
import { handleMutationError } from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'

const supabase = createClient()

/**
 * MFA query keys
 */
export const mfaKeys = {
	all: ['mfa'] as const,
	factors: () => [...mfaKeys.all, 'factors'] as const,
	status: () => [...mfaKeys.all, 'status'] as const
}

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

/**
 * Enrollment result with QR code
 */
export interface EnrollmentResult {
	factorId: string
	qrCode: string
	secret: string
	uri: string
}

/**
 * Get current MFA status and assurance level
 */
export function useMfaStatus() {
	return useQuery({
		queryKey: mfaKeys.status(),
		queryFn: async (): Promise<MfaStatus> => {
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
	})
}

/**
 * List enrolled MFA factors
 */
export function useMfaFactors() {
	return useQuery({
		queryKey: mfaKeys.factors(),
		queryFn: async (): Promise<EnrolledFactor[]> => {
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

/**
 * Enroll a new TOTP factor
 * Returns QR code and secret for authenticator app setup
 */
export function useMfaEnrollMutation() {
	return useMutation({
		mutationKey: mutationKeys.mfa.enroll,
		mutationFn: async (friendlyName?: string): Promise<EnrollmentResult> => {
			const { data, error } = await supabase.auth.mfa.enroll({
				factorType: 'totp',
				friendlyName: friendlyName ?? 'Authenticator App'
			})

			if (error) throw error

			return {
				factorId: data.id,
				qrCode: data.totp.qr_code,
				secret: data.totp.secret,
				uri: data.totp.uri
			}
		},
		onError: (error: Error) => handleMutationError(error, 'MFA enrollment')
	})
}

/**
 * Verify TOTP code during enrollment or challenge
 */
export function useMfaVerifyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.mfa.verify,
		mutationFn: async ({
			factorId,
			code
		}: {
			factorId: string
			code: string
		}): Promise<void> => {
			// Create a challenge first
			const { data: challengeData, error: challengeError } =
				await supabase.auth.mfa.challenge({ factorId })

			if (challengeError) throw challengeError

			// Verify the code
			const { error: verifyError } = await supabase.auth.mfa.verify({
				factorId,
				challengeId: challengeData.id,
				code
			})

			if (verifyError) throw verifyError
		},
		onSuccess: () => {
			// Invalidate MFA queries to refresh status
			queryClient.invalidateQueries({ queryKey: mfaKeys.all })
			toast.success('Two-factor authentication verified')
		},
		onError: (error: Error) => handleMutationError(error, 'MFA verification')
	})
}

/**
 * Unenroll (remove) an MFA factor
 */
export function useMfaUnenrollMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationKey: mutationKeys.mfa.unenroll,
		mutationFn: async (factorId: string): Promise<void> => {
			const { error } = await supabase.auth.mfa.unenroll({ factorId })

			if (error) throw error
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mfaKeys.all })
			toast.success('Two-factor authentication disabled')
		},
		onError: (error: Error) => handleMutationError(error, 'Disable 2FA')
	})
}

/**
 * Check if MFA verification is required for current session
 * Used during login flow to determine if MFA challenge is needed
 */
export function useRequiresMfaVerification() {
	const { data: status } = useMfaStatus()
	return status?.requiresMfaVerification ?? false
}
