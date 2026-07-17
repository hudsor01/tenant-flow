/**
 * Inspection Query Hooks
 * TanStack Query hooks for inspection data fetching.
 *
 * Query keys are in a separate file to avoid circular dependencies.
 * Mutation hooks (CRUD, rooms, photos) are in use-inspection-mutations.ts.
 *
 * React 19 + TanStack Query v5 patterns
 */

import { useQuery } from "@tanstack/react-query";
import type { InspectionFilters } from "./query-keys/inspection-keys";
import { inspectionQueries } from "./query-keys/inspection-keys";

/**
 * Hook to fetch inspections for the current owner with pagination.
 */
export function useInspections(filters?: InspectionFilters) {
	return useQuery(inspectionQueries.list(filters));
}
