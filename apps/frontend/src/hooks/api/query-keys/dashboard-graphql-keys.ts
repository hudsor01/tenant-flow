/**
 * Dashboard pg_graphql Query Keys & Options
 *
 * Uses pg_graphql to fetch portfolio data in a single request instead of N+1 PostgREST calls.
 * pg_graphql is accessible via supabase.rpc('graphql.resolve', { query }) — no migration needed,
 * the extension is already enabled in supabase/schemas/extensions.sql.
 *
 * RLS is enforced server-side: pg_graphql respects auth.uid() automatically,
 * so no explicit user_id filter is needed in the GraphQL query.
 */

import { queryOptions } from '@tanstack/react-query'
import { createClient } from '#lib/supabase/client'
import { handlePostgrestError } from '#lib/postgrest-error-handler'
import * as Sentry from '@sentry/nextjs'
import type { GraphQLPropertyNode, PortfolioOverviewData } from '@repo/shared/types/analytics'

// ============================================================================
// GRAPHQL QUERY
// ============================================================================

/**
 * Portfolio overview query — fetches all owner properties with per-property
 * unit counts and revenue in a single request.
 * RLS on `properties` ensures only the authenticated owner's properties are returned.
 */
const PORTFOLIO_OVERVIEW_QUERY = `
  query PortfolioOverview {
    propertiesCollection(
      filter: { status: { neq: "inactive" } }
      orderBy: [{ createdAt: DescNullsLast }]
    ) {
      edges {
        node {
          id
          name
          addressLine1
          city
          state
          postalCode
          status
          propertyType
          unitsCollection {
            totalCount
            edges {
              node {
                id
                status
                rentAmount
              }
            }
          }
        }
      }
      totalCount
    }
  }
`

// ============================================================================
// QUERY FACTORY
// ============================================================================

export const dashboardGraphQLQueries = {
	all: () => ['dashboard-graphql'] as const,

	portfolioOverview: () =>
		queryOptions({
			queryKey: [...dashboardGraphQLQueries.all(), 'portfolio-overview'],
			queryFn: async (): Promise<PortfolioOverviewData> => {
				const supabase = createClient()

				// supabase.rpc('graphql.resolve') — the dot in the name is valid Supabase RPC syntax
				// Cast to avoid TypeScript complaining about the generated types not including this RPC
				const { data, error } = await (
					supabase as ReturnType<typeof createClient>
				).rpc('graphql.resolve' as string, {
					query: PORTFOLIO_OVERVIEW_QUERY
				} as Record<string, unknown>)

				if (error) handlePostgrestError(error, 'pg_graphql portfolio')

				// pg_graphql returns { data: { ... }, errors?: [...] }
				const gqlData = data as {
					data?: {
						propertiesCollection?: {
							edges: Array<{ node: GraphQLPropertyNode }>
							totalCount: number
						}
					}
					errors?: Array<{ message: string }>
				}

				if (gqlData.errors?.length) {
					Sentry.captureException(
						new Error(`pg_graphql error: ${gqlData.errors[0]?.message ?? 'unknown'}`)
					)
					return {
						properties: [],
						totalProperties: 0,
						totalUnits: 0,
						occupiedUnits: 0,
						overallOccupancyRate: 0,
						totalMonthlyRevenue: 0
					}
				}

				const edges = gqlData.data?.propertiesCollection?.edges ?? []
				const totalProperties =
					gqlData.data?.propertiesCollection?.totalCount ?? 0

				const properties = edges.map(({ node }) => {
					const totalUnits = node.unitsCollection.totalCount
					const occupiedUnits = node.unitsCollection.edges.filter(
						e => e.node.status === 'occupied'
					).length
					const monthlyRevenue = node.unitsCollection.edges
						.filter(e => e.node.status === 'occupied')
						.reduce((sum, e) => sum + (e.node.rentAmount ?? 0), 0)

					return {
						id: node.id,
						name: node.name,
						address: [node.addressLine1, node.city, node.state]
							.filter(Boolean)
							.join(', '),
						status: node.status,
						totalUnits,
						occupiedUnits,
						occupancyRate:
							totalUnits > 0
								? Math.round((occupiedUnits / totalUnits) * 100)
								: 0,
						monthlyRevenue
					}
				})

				const totalUnits = properties.reduce((sum, p) => sum + p.totalUnits, 0)
				const totalOccupied = properties.reduce(
					(sum, p) => sum + p.occupiedUnits,
					0
				)
				const totalRevenue = properties.reduce(
					(sum, p) => sum + p.monthlyRevenue,
					0
				)

				return {
					properties,
					totalProperties,
					totalUnits,
					occupiedUnits: totalOccupied,
					overallOccupancyRate:
						totalUnits > 0
							? Math.round((totalOccupied / totalUnits) * 100)
							: 0,
					totalMonthlyRevenue: totalRevenue
				}
			},
			staleTime: 2 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			refetchOnWindowFocus: false
		})
}
