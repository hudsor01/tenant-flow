"use client"

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { createSelector } from 'reselect'
import type { Property } from '@repo/shared/types/core'
import type { UpdatePropertyInput } from '@repo/shared/types/api-inputs'
import type { Database } from '@repo/shared/types/supabase-generated'

type PropertyType = Database['public']['Enums']['PropertyType']
type PropertyStatus = Database['public']['Enums']['PropertyStatus']

type FacetKey = 'cities' | 'statuses' | 'types'

type Filters = {
	search: string
	cities: string[]
	statuses: string[]
	types: string[]
}

type Facets = {
	cities: string[]
	statuses: string[]
	types: string[]
}

type DraftMap = Record<string, Partial<UpdatePropertyInput>>

type SearchIndex = Map<string, Set<string>>
type PrefixIndex = Map<string, Set<string>>
type PropertyMap = Record<string, Property>

const DEFAULT_COLUMN_ORDER = ['name', 'location', 'type', 'status', 'updatedAt', 'actions']

interface PropertiesViewState {
	data: Property[]
	idMap: PropertyMap
	searchIndex: SearchIndex
	prefixIndex: PrefixIndex
	filters: Filters
	facets: Facets
	columnOrder: string[]
	pageSize: number
	editingId: string | null
	drafts: DraftMap
	setProperties: (properties: Property[]) => void
	setSearch: (value: string) => void
	clearSearch: () => void
	toggleFacet: (key: FacetKey, value: string) => void
	clearFacet: (key: FacetKey) => void
	clearFilters: () => void
	setColumnOrder: (order: string[]) => void
	setPageSize: (size: number) => void
	startEditing: (property: Property) => void
	updateDraft: (id: string, patch: Partial<UpdatePropertyInput>) => void
	cancelEditing: () => void
	applyPropertyUpdate: (id: string, updates: Partial<Property>) => void
	applyBulkStatus: (ids: string[], status: Property['status']) => void
}

const defaultFilters: Filters = {
	search: '',
	cities: [],
	statuses: [],
	types: []
}

function normaliseToken(value: string | null | undefined) {
	return (value ?? '').trim().toLowerCase()
}

const STATUS_FIELD = 'status'
const TYPE_FIELD = 'propertyType'

function readStringField(property: Property, key: string): string | null {
	const record = property as Record<string, unknown>
	const candidate = record[key]
	return typeof candidate === 'string' ? candidate : null
}

function createPropertyState(properties: Property[]) {
	const idMap: PropertyMap = {}
	const searchIndex: SearchIndex = new Map()
	const prefixIndex: PrefixIndex = new Map()

	const cities = new Set<string>()
	const statuses = new Set<string>()
	const types = new Set<string>()

	properties.forEach(property => {
	idMap[property.id] = property
	if (property.city) cities.add(property.city)
	const statusValue = readStringField(property, STATUS_FIELD)
	if (statusValue) statuses.add(statusValue)
	const typeValue = readStringField(property, TYPE_FIELD)
	if (typeValue) types.add(typeValue)

	const tokens = new Set<string>()
	;[
		property.name,
		property.address,
		property.city,
		property.state,
		property.zipCode,
		typeValue,
		statusValue
	].forEach(value => {
		const token = normaliseToken(value)
		if (token.length === 0) return
		tokens.add(token)
	})

		tokens.forEach(token => {
			let bucket = searchIndex.get(token)
			if (!bucket) {
				bucket = new Set<string>()
				searchIndex.set(token, bucket)
			}
			bucket.add(property.id)

			const prefix = token.slice(0, Math.min(3, token.length))
			let prefixBucket = prefixIndex.get(prefix)
			if (!prefixBucket) {
				prefixBucket = new Set<string>()
				prefixIndex.set(prefix, prefixBucket)
			}
			prefixBucket.add(token)
		})
	})

	return {
		data: properties,
		idMap,
		searchIndex,
		prefixIndex,
		facets: {
			cities: Array.from(cities).sort((a, b) => a.localeCompare(b)),
			statuses: Array.from(statuses).sort((a, b) => a.localeCompare(b)),
			types: Array.from(types).sort((a, b) => a.localeCompare(b))
		} satisfies Facets
	}
}

export const usePropertiesViewStore = create<PropertiesViewState>()(
	persist(
		subscribeWithSelector(set => ({
			...createPropertyState([]),
			filters: { ...defaultFilters },
			columnOrder: DEFAULT_COLUMN_ORDER,
			pageSize: 20,
			editingId: null,
			drafts: {},
			setProperties: properties => {
				set(state => ({
					...state,
					...createPropertyState(properties)
				}))
			},
			setSearch: value =>
				set(state => ({
					filters: { ...state.filters, search: value }
				})),
			clearSearch: () =>
				set(state => ({
					filters: { ...state.filters, search: '' }
				})),
			toggleFacet: (key, value) =>
				set(state => {
					const current = new Set(state.filters[key])
					if (current.has(value)) {
						current.delete(value)
					} else {
						current.add(value)
					}
					return {
						filters: {
							...state.filters,
							[key]: Array.from(current)
						}
					}
				}),
			clearFacet: key =>
				set(state => ({
					filters: {
						...state.filters,
						[key]: []
					}
				})),
		clearFilters: () =>
			set(() => ({
				filters: { ...defaultFilters }
			})),
	setColumnOrder: order =>
		set(() => ({
			columnOrder: order
		})),
	setPageSize: size =>
		set(() => ({
			pageSize: size
		})),
	startEditing: property =>
		set((state): Partial<PropertiesViewState> => {
			const draft: Partial<UpdatePropertyInput> = {
				name: property.name
			}
			const propType = readStringField(property, TYPE_FIELD)
			if (propType) draft.propertyType = propType as PropertyType
			const propStatus = readStringField(property, STATUS_FIELD)
			if (propStatus) draft.status = propStatus as PropertyStatus

			return {
				editingId: property.id,
				drafts: {
					...state.drafts,
					[property.id]: draft
				}
			}
		}),
			updateDraft: (id, patch) =>
				set(state => {
					const current = state.drafts[id] ?? {}
					return {
						drafts: {
							...state.drafts,
							[id]: { ...current, ...patch }
						}
					}
				}),
			cancelEditing: () =>
				set(state => ({
					editingId: null,
					drafts: state.editingId
						? Object.fromEntries(
								Object.entries(state.drafts).filter(([key]) => key !== state.editingId)
							)
						: state.drafts
				})),
			applyPropertyUpdate: (id, updates) =>
				set(state => {
					const updated = state.data.map(property =>
						property.id === id ? { ...property, ...updates } : property
					)
					return {
						...state,
						...createPropertyState(updated),
						editingId: state.editingId === id ? null : state.editingId,
						drafts:
							state.editingId === id
								? Object.fromEntries(
										Object.entries(state.drafts).filter(([key]) => key !== id)
									)
								: state.drafts
					}
				}),
			applyBulkStatus: (ids, status) =>
				set(state => {
					if (!ids.length) return state
					const updates = state.data.map(property =>
						ids.includes(property.id) ? { ...property, status } : property
					)
					return {
						...state,
						...createPropertyState(updates)
					}
				})
		})),
		{
			name: 'properties-view',
			partialize: state => ({
				columnOrder: state.columnOrder,
				pageSize: state.pageSize
			})
		}
	)
)

const filteredPropertiesSelector = createSelector(
	(state: PropertiesViewState) => state.data,
	(state: PropertiesViewState) => state.idMap,
	(state: PropertiesViewState) => state.searchIndex,
	(state: PropertiesViewState) => state.prefixIndex,
	(state: PropertiesViewState) => state.filters,
	(data, idMap, searchIndex, prefixIndex, filters) => {
		if (!data.length) return []

		let candidateIds: Set<string> | null = null

		const searchTerm = normaliseToken(filters.search)
		if (searchTerm.length > 0) {
			const prefix = searchTerm.slice(0, Math.min(3, searchTerm.length))
			const tokens = prefixIndex.get(prefix)
			if (!tokens) {
				candidateIds = new Set()
			} else {
				const ids = new Set<string>()
				tokens.forEach(token => {
					if (token.startsWith(searchTerm)) {
						const matches = searchIndex.get(token)
						if (matches) {
							matches.forEach(id => ids.add(id))
						}
					}
				})
				candidateIds = ids
			}
		}

		const applyFacet = (
			selected: string[],
			resolver: (property: Property) => string | null | undefined
		) => {
			if (!selected.length) return
			const selectedSet = new Set(
				selected.map(value => normaliseToken(value))
			)
			const sourceIds =
				candidateIds ?? new Set<string>(data.map(property => property.id))
			const nextIds = new Set<string>()
			sourceIds.forEach(id => {
				const property = idMap[id]
				if (!property) return
				const resolved = normaliseToken(resolver(property))
				if (selectedSet.has(resolved)) {
					nextIds.add(id)
				}
			})
			candidateIds = nextIds
		}

		applyFacet(filters.cities, property => property.city)
		applyFacet(filters.statuses, property => readStringField(property, STATUS_FIELD))
		applyFacet(filters.types, property => readStringField(property, TYPE_FIELD))

		const idSet =
			candidateIds ?? new Set<string>(data.map(property => property.id))

		if (!idSet.size) return []

		const result: Property[] = []
		data.forEach(property => {
			if (idSet.has(property.id)) {
				result.push(property)
			}
		})

		return result
	}
)

const typeaheadSelector = createSelector(
	(state: PropertiesViewState) => state.filters.search,
	(state: PropertiesViewState) => state.searchIndex,
	(state: PropertiesViewState) => state.prefixIndex,
	(state: PropertiesViewState) => state.idMap,
	(search, searchIndex, prefixIndex, idMap) => {
		const term = normaliseToken(search)
		if (!term || term.length < 2) return []
		const prefix = term.slice(0, Math.min(3, term.length))
		const tokens = prefixIndex.get(prefix)
		if (!tokens) return []
		const suggestions: string[] = []
		const seen = new Set<string>()
		for (const token of tokens) {
			if (!token.startsWith(term)) continue
			const ids = searchIndex.get(token)
			if (!ids) continue
			for (const id of ids) {
				const property = idMap[id]
				if (!property || !property.name) continue
				const normalizedName = property.name.toLowerCase()
				if (seen.has(normalizedName)) continue
				seen.add(normalizedName)
				suggestions.push(property.name)
				if (suggestions.length >= 8) return suggestions
			}
		}
		return suggestions
	}
)

export const selectFilteredProperties = (state: PropertiesViewState) =>
	filteredPropertiesSelector(state)

export const selectTypeaheadSuggestions = (state: PropertiesViewState) =>
	typeaheadSelector(state)

export const selectFilters = (state: PropertiesViewState) => state.filters
export const selectFacets = (state: PropertiesViewState) => state.facets
export const selectColumnOrder = (state: PropertiesViewState) => state.columnOrder
export const selectPageSize = (state: PropertiesViewState) => state.pageSize
export const selectEditingId = (state: PropertiesViewState) => state.editingId
export const selectDraftById = (id: string) => (state: PropertiesViewState) =>
	state.drafts[id] ?? {}
