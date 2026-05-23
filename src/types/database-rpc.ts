/**
 * Database RPC Function Response Types
 *
 * TypeScript interfaces for RPC function responses from Supabase database functions.
 * These provide type safety for complex database queries that return JSON/JSONB data.
 */

/**
 * Per-row shape of `get_dashboard_data_v2`'s `property_performance` JSONB
 * array. Phase 2 (POLISH-10) extended this with `open_maintenance` —
 * sourced from the new `perf_open_maintenance` CTE in the migration at
 * `supabase/migrations/20260523223626_phase2_open_maintenance_per_property.sql`.
 *
 * The fetcher boundary at `src/hooks/api/use-owner-dashboard.ts:218-249`
 * narrows the raw JSONB to `PropertyPerformanceRpcResponse[]` and emits
 * `PropertyPerformance[]` (the section-typed shape consumed by the
 * dashboard view).
 */
export interface PropertyPerformanceRpcResponse {
	property_name: string;
	property_id: string;
	total_units: number;
	occupied_units: number;
	vacant_units: number;
	occupancy_rate: number;
	annual_revenue: number;
	monthly_revenue: number;
	potential_revenue: number;
	address: string;
	property_type: string;
	status: string;
	open_maintenance: number;
}

/**
 * Response for occupancy trends (calculated in-app)
 */
export interface OccupancyTrendResponse {
	month: string;
	occupancy_rate: number;
	total_units: number;
	occupied_units: number;
}

/**
 * Response for revenue trends (calculated in-app)
 */
export interface RevenueTrendResponse {
	month: string;
	revenue: number;
	growth: number;
	previous_period_revenue: number;
}
