'use client'

import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { getCachedUser } from '#lib/supabase/get-cached-user'
import { QUERY_CACHE_TIMES } from '#lib/constants/query-config'

interface OnboardingStatusResult {
	onboarding_status: string | null
}

export const onboardingKeys = {
	all: ['onboarding'] as const,
	status: () => [...onboardingKeys.all, 'status'] as const
}

const onboardingQueries = {
	status: () =>
		queryOptions({
			queryKey: onboardingKeys.status(),
			queryFn: async (): Promise<OnboardingStatusResult> => {
				const supabase = createClient()
				const user = await getCachedUser()

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

export function useOnboarding() {
	const queryClient = useQueryClient()

	const { data, isLoading } = useQuery(onboardingQueries.status())

	const onboardingStatus = data?.onboarding_status ?? null
	const showWizard =
		!isLoading &&
		(onboardingStatus === null || onboardingStatus === 'not_started')

	const updateMutation = useMutation({
		mutationFn: async (status: 'started' | 'completed' | 'skipped') => {
			const supabase = createClient()
			const user = await getCachedUser()
			if (!user) throw new Error('Not authenticated')
			const { error } = await supabase
				.from('users')
				.update({ onboarding_status: status })
				.eq('id', user.id)
			if (error) throw error
			return { success: true, status }
		},
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
