// Updated: useActivityFeed now uses our new tRPC backend routers

import { useQuery } from '@tanstack/react-query'
import { trpc } from '@/lib/trpcClient'
import type { ActivityItem, Activity, ActivityMetadata, ActivityPriority } from '@/types/activity'

export function useActivityFeed(limit = 10) {
	return useQuery({
		queryKey: ['activityFeed', limit],
		queryFn: async () => {
			const response = await trpc.activity.getFeed.fetch({ limit })
			return response
		},
		staleTime: 5 * 60 * 1000, // 5 minutes
		retry: false
	})
}
