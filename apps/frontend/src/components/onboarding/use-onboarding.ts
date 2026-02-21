'use client'

/**
 * Onboarding Hook
 *
 * Manages the onboarding wizard state for new landlords.
 * Reads onboarding_status from the public.users table via Supabase client.
 * Updates status via PATCH /api/v1/users/me/onboarding.
 */

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiRequest } from '#lib/api-request'
import { createClient } from '#lib/supabase/client'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'

// ============================================================================
// TYPES
// ============================================================================

interface OnboardingStatusResult {
	onboarding_status: string | null
}

// ============================================================================
// QUERY KEYS
// ============================================================================

export const onboardingKeys = {
	all: ['onboarding'] as const,
	status: () => [...onboardingKeys.all, 'status'] as const
}

// ============================================================================
// QUERY OPTIONS
// ============================================================================

const onboardingQueries = {
	status: () =>
		queryOptions({
			queryKey: onboardingKeys.status(),
			queryFn: async (): Promise<OnboardingStatusResult> => {
				const supabase = createClient()
				const {
					data: { user }
				} = await supabase.auth.getUser()

				if (!user) {
					return { onboarding_status: null }
				}

				const { data, error } = await supabase
					.from('users')
					.select('onboarding_status')
					.eq('id', user.id)
					.single()

				if (error || !data) {
					return { onboarding_status: null }
				}

				return { onboarding_status: data.onboarding_status }
			},
			...QUERY_CACHE_TIMES.DETAIL,
			retry: false
		})
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook to manage onboarding wizard state
 *
 * Returns:
 * - showWizard: true when onboarding_status is null or 'not_started'
 * - completeOnboarding: mutation to mark onboarding as completed
 * - skipOnboarding: mutation to mark onboarding as skipped
 * - isLoading: true while status is being fetched
 */
export function useOnboarding() {
	const queryClient = useQueryClient()

	const { data, isLoading } = useQuery(onboardingQueries.status())

	const onboardingStatus = data?.onboarding_status ?? null
	const showWizard =
		!isLoading &&
		(onboardingStatus === null || onboardingStatus === 'not_started')

	const updateMutation = useMutation({
		mutationFn: (status: 'started' | 'completed' | 'skipped') =>
			apiRequest<{ success: boolean; status: string }>(
				'/api/v1/users/me/onboarding',
				{
					method: 'PATCH',
					body: JSON.stringify({ status })
				}
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: onboardingKeys.all })
		}
	})

	const completeOnboarding = () => {
		updateMutation.mutate('completed')
	}

	const skipOnboarding = () => {
		updateMutation.mutate('skipped')
	}

	return {
		showWizard,
		isLoading,
		completeOnboarding,
		skipOnboarding,
		isUpdating: updateMutation.isPending
	}
}
