/**
 * MFA (Multi-Factor Authentication) Hooks
 * TanStack Query hooks for Supabase MFA TOTP operations
 *
 * @see https://supabase.com/docs/guides/auth/auth-mfa
 */

import { useMutation, useQuery, useQueryClient, mutationOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { toast } from 'sonner'
import { handleMutationError } from '#lib/mutation-error-handler'
import { mutationKeys } from './mutation-keys'
import { mfaKeys, mfaQueries } from './query-keys/mfa-keys'


/**
 * Enrollment result with QR code
 */
export interface EnrollmentResult {
	factorId: string
	qrCode: string
	secret: string
	uri: string
}

const mfaMutationFactories = {
	enroll: () =>
		mutationOptions({
			mutationKey: mutationKeys.mfa.enroll,
			mutationFn: async (friendlyName?: string): Promise<EnrollmentResult> => {
				const supabase = createClient()
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
			}
		}),

	verify: () =>
		mutationOptions<void, unknown, { factorId: string; code: string }>({
			mutationKey: mutationKeys.mfa.verify,
			mutationFn: async ({ factorId, code }) => {
				const supabase = createClient()
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
			}
		}),

	unenroll: () =>
		mutationOptions<void, unknown, string>({
			mutationKey: mutationKeys.mfa.unenroll,
			mutationFn: async (factorId: string) => {
				const supabase = createClient()
				const { error } = await supabase.auth.mfa.unenroll({ factorId })

				if (error) throw error
			}
		})
}

/**
 * Get current MFA status and assurance level
 */
export function useMfaStatus() {
	return useQuery(mfaQueries.status())
}

/**
 * List enrolled MFA factors
 */
export function useMfaFactors() {
	return useQuery(mfaQueries.factors())
}

/**
 * Enroll a new TOTP factor
 * Returns QR code and secret for authenticator app setup
 */
export function useMfaEnrollMutation() {
	return useMutation({
		...mfaMutationFactories.enroll(),
		onError: (error) => handleMutationError(error, 'MFA enrollment')
	})
}

/**
 * Verify TOTP code during enrollment or challenge
 */
export function useMfaVerifyMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...mfaMutationFactories.verify(),
		onSuccess: () => {
			// Invalidate MFA queries to refresh status
			queryClient.invalidateQueries({ queryKey: mfaKeys.all })
			toast.success('Two-factor authentication verified')
		},
		onError: (error) => handleMutationError(error, 'MFA verification')
	})
}

/**
 * Unenroll (remove) an MFA factor
 */
export function useMfaUnenrollMutation() {
	const queryClient = useQueryClient()

	return useMutation({
		...mfaMutationFactories.unenroll(),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: mfaKeys.all })
			toast.success('Two-factor authentication disabled')
		},
		onError: (error) => handleMutationError(error, 'Disable 2FA')
	})
}
