/**
 * Centralized Query Key Factory
 * 
 * This file provides a type-safe, hierarchical structure for all TanStack Query keys
 * used throughout the application. Following TanStack Query best practices for
 * cache invalidation and organization.
 * 
 * Key Benefits:
 * - Type safety for all query keys
 * - Consistent invalidation patterns
 * - Easier refactoring and maintenance
 * - Prevents cache invalidation bugs
 */

import type { QueryClient } from '@tanstack/react-query'
import type { BlogFilters, BlogPagination } from '@repo/shared'

// ===== AUTH QUERIES =====
export const authKeys = {
	all: ['auth'] as const,
	status: () => [...authKeys.all, 'status'] as const,
	profile: () => [...authKeys.all, 'profile'] as const,
	session: () => [...authKeys.all, 'session'] as const,
} as const

// ===== PROPERTIES QUERIES =====
export const propertyKeys = {
	all: ['properties'] as const,
	lists: () => [...propertyKeys.all, 'list'] as const,
	list: (filters?: Record<string, unknown>) => [...propertyKeys.lists(), { filters }] as const,
	details: () => [...propertyKeys.all, 'detail'] as const,
	detail: (id: string) => [...propertyKeys.details(), id] as const,
	analytics: (id: string) => [...propertyKeys.detail(id), 'analytics'] as const,
	documents: (id: string) => [...propertyKeys.detail(id), 'documents'] as const,
	units: (id: string) => [...propertyKeys.detail(id), 'units'] as const,
	maintenance: (id: string) => [...propertyKeys.detail(id), 'maintenance'] as const,
} as const

// ===== TENANTS QUERIES =====
export const tenantKeys = {
	all: ['tenants'] as const,
	lists: () => [...tenantKeys.all, 'list'] as const,
	list: (filters?: Record<string, unknown>) => [...tenantKeys.lists(), { filters }] as const,
	details: () => [...tenantKeys.all, 'detail'] as const,
	detail: (id: string) => [...tenantKeys.details(), id] as const,
	profile: (id: string) => [...tenantKeys.detail(id), 'profile'] as const,
	documents: (id: string) => [...tenantKeys.detail(id), 'documents'] as const,
	payments: (id: string) => [...tenantKeys.detail(id), 'payments'] as const,
	lease: (id: string) => [...tenantKeys.detail(id), 'lease'] as const,
	maintenance: (id: string) => [...tenantKeys.detail(id), 'maintenance'] as const,
	invitations: () => [...tenantKeys.all, 'invitations'] as const,
	invitation: (token: string) => [...tenantKeys.invitations(), token] as const,
	dashboard: () => [...tenantKeys.all, 'dashboard'] as const,
} as const

// ===== FINANCIAL QUERIES =====
export const financialKeys = {
	all: ['financial'] as const,
	analytics: () => [...financialKeys.all, 'analytics'] as const,
	propertyAnalytics: (propertyId: string) => [...financialKeys.analytics(), propertyId] as const,
	payments: () => [...financialKeys.all, 'payments'] as const,
	propertyPayments: (propertyId: string) => [...financialKeys.payments(), propertyId] as const,
	tenantPayments: (tenantId: string) => [...financialKeys.payments(), 'tenant', tenantId] as const,
	reminders: () => [...financialKeys.all, 'reminders'] as const,
	propertyReminders: (propertyId: string) => [...financialKeys.reminders(), propertyId] as const,
} as const

// ===== SUBSCRIPTION & BILLING QUERIES =====
export const subscriptionKeys = {
	all: ['subscription'] as const,
	current: () => [...subscriptionKeys.all, 'current'] as const,
	status: () => [...subscriptionKeys.all, 'status'] as const,
	history: () => [...subscriptionKeys.all, 'history'] as const,
	usage: () => [...subscriptionKeys.all, 'usage'] as const,
	checkout: () => [...subscriptionKeys.all, 'checkout'] as const,
	portal: () => [...subscriptionKeys.all, 'portal'] as const,
} as const

// ===== MAINTENANCE QUERIES =====
export const maintenanceKeys = {
	all: ['maintenance'] as const,
	requests: () => [...maintenanceKeys.all, 'requests'] as const,
	propertyRequests: (propertyId: string) => [...maintenanceKeys.requests(), propertyId] as const,
	tenantRequests: (tenantId: string) => [...maintenanceKeys.requests(), 'tenant', tenantId] as const,
	request: (id: string) => [...maintenanceKeys.requests(), id] as const,
} as const

// ===== BLOG QUERIES =====
export const blogKeys = {
	all: ['blog'] as const,
	articles: () => [...blogKeys.all, 'articles'] as const,
	article: (slug: string) => [...blogKeys.articles(), slug] as const,
	list: (filters: BlogFilters, pagination: BlogPagination) =>
		[...blogKeys.articles(), 'list', filters, pagination] as const,
	featured: () => [...blogKeys.articles(), 'featured'] as const,
	related: (articleId: string, category: string) =>
		[...blogKeys.articles(), 'related', articleId, category] as const,
	tags: () => [...blogKeys.all, 'tags'] as const,
	categories: () => [...blogKeys.all, 'categories'] as const,
} as const

// ===== NOTIFICATIONS QUERIES =====
export const notificationKeys = {
	all: ['notifications'] as const,
	list: () => [...notificationKeys.all, 'list'] as const,
	unread: () => [...notificationKeys.all, 'unread'] as const,
	count: () => [...notificationKeys.all, 'count'] as const,
} as const

// ===== LEASE QUERIES =====
export const leaseKeys = {
	all: ['leases'] as const,
	lists: () => [...leaseKeys.all, 'list'] as const,
	list: (filters?: Record<string, unknown>) => [...leaseKeys.lists(), { filters }] as const,
	details: () => [...leaseKeys.all, 'detail'] as const,
	detail: (id: string) => [...leaseKeys.details(), id] as const,
	generator: () => [...leaseKeys.all, 'generator'] as const,
	templates: () => [...leaseKeys.generator(), 'templates'] as const,
	template: (state: string) => [...leaseKeys.templates(), state] as const,
} as const

// ===== REPORTS QUERIES =====
export const reportKeys = {
	all: ['reports'] as const,
	financial: () => [...reportKeys.all, 'financial'] as const,
	occupancy: () => [...reportKeys.all, 'occupancy'] as const,
	maintenance: () => [...reportKeys.all, 'maintenance'] as const,
	custom: (id: string) => [...reportKeys.all, 'custom', id] as const,
} as const

// ===== SETTINGS QUERIES =====
export const settingsKeys = {
	all: ['settings'] as const,
	profile: () => [...settingsKeys.all, 'profile'] as const,
	preferences: () => [...settingsKeys.all, 'preferences'] as const,
	integrations: () => [...settingsKeys.all, 'integrations'] as const,
	notifications: () => [...settingsKeys.all, 'notifications'] as const,
} as const

// ===== MASTER QUERY KEYS OBJECT =====
export const queryKeys = {
	auth: authKeys,
	properties: propertyKeys,
	tenants: tenantKeys,
	financial: financialKeys,
	subscriptions: subscriptionKeys,
	maintenance: maintenanceKeys,
	blog: blogKeys,
	notifications: notificationKeys,
	leases: leaseKeys,
	reports: reportKeys,
	settings: settingsKeys,
} as const

// ===== CACHE CONFIGURATION PRESETS =====
export const cacheConfig = {
	// Real-time data (notifications, live updates)
	realtime: {
		staleTime: 30 * 1000, // 30 seconds
		gcTime: 2 * 60 * 1000, // 2 minutes
	},
	// Business data (properties, tenants, finances)
	business: {
		staleTime: 2 * 60 * 1000, // 2 minutes
		gcTime: 10 * 60 * 1000, // 10 minutes
	},
	// Reference data (settings, auth, static content)
	reference: {
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 30 * 60 * 1000, // 30 minutes
	},
	// Long-lived data (blog articles, templates)
	longLived: {
		staleTime: 10 * 60 * 1000, // 10 minutes
		gcTime: 60 * 60 * 1000, // 1 hour
	},
} as const

// ===== UTILITY FUNCTIONS =====

/**
 * Invalidate all queries for a specific entity type
 */
export function invalidateEntityQueries(
	queryClient: QueryClient,
	entityType: keyof typeof queryKeys
) {
	return queryClient.invalidateQueries({
		queryKey: queryKeys[entityType].all,
	})
}

/**
 * Remove all queries for a specific entity type
 */
export function removeEntityQueries(
	queryClient: QueryClient,
	entityType: keyof typeof queryKeys
) {
	return queryClient.removeQueries({
		queryKey: queryKeys[entityType].all,
	})
}

/**
 * Prefetch a specific query with default cache config
 */
export function prefetchQuery<TData = unknown>(
	queryClient: QueryClient,
	queryKey: readonly unknown[],
	queryFn: () => Promise<TData>,
	cacheType: keyof typeof cacheConfig = 'business'
) {
	return queryClient.prefetchQuery({
		queryKey,
		queryFn,
		...cacheConfig[cacheType],
	})
}

// ===== TYPE EXPORTS =====
export type QueryKeys = typeof queryKeys
export type CacheConfig = typeof cacheConfig
export type EntityType = keyof typeof queryKeys