/**
 * Unit Store
 * Zustand store for unit state management with normalized data structure
 * Follows the proven tenant-store.ts pattern
 */

import type { Unit } from '@repo/shared/types/core'
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

interface UnitStore {
	currentUnit: Unit | null
	selectedUnitId: string | null

	// Unit list and cache (normalized: { [id]: Unit })
	units: Record<string, Unit>
	unitList: string[]
	isLoading: boolean
	hasFetched: boolean

	// Filter state
	currentPropertyId: string | null
	currentStatus: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' | null

	// Actions
	setCurrentUnit: (unit: Unit | null) => void
	setSelectedUnitId: (id: string | null) => void
	addUnit: (unit: Unit) => void
	updateUnit: (id: string, updates: Partial<Unit>) => void
	removeUnit: (id: string) => void
	setUnits: (units: Unit[]) => void
	setLoading: (loading: boolean) => void
	setCurrentPropertyId: (propertyId: string | null) => void
	setCurrentStatus: (
		status: 'VACANT' | 'OCCUPIED' | 'MAINTENANCE' | 'RESERVED' | null
	) => void
	clear: () => void
}

export const useUnitStore = create<UnitStore>()(
	subscribeWithSelector(set => ({
		currentUnit: null,
		selectedUnitId: null,
		units: {},
		unitList: [],
		isLoading: false,
		hasFetched: false,
		currentPropertyId: null,
		currentStatus: null,

		setCurrentUnit: unit => set({ currentUnit: unit }),
		setSelectedUnitId: id => set({ selectedUnitId: id }),

		addUnit: unit =>
			set(state => ({
				units: { ...state.units, [unit.id]: unit },
				unitList: state.unitList.includes(unit.id)
					? state.unitList
					: [...state.unitList, unit.id]
			})),

		updateUnit: (id, updates) =>
			set(state => {
				const existingUnit = state.units[id]
				if (!existingUnit) return state

				const updatedUnit = { ...existingUnit, ...updates } as Unit
				return {
					units: {
						...state.units,
						[id]: updatedUnit
					},
					currentUnit:
						state.currentUnit?.id === id ? updatedUnit : state.currentUnit
				}
			}),

		removeUnit: id =>
			set(state => {
				const remainingUnits = { ...state.units }
				delete remainingUnits[id]
				return {
					units: remainingUnits,
					unitList: state.unitList.filter(unitId => unitId !== id),
					currentUnit: state.currentUnit?.id === id ? null : state.currentUnit,
					selectedUnitId:
						state.selectedUnitId === id ? null : state.selectedUnitId
				}
			}),

		setUnits: units =>
			set({
				units: units.reduce(
					(acc, unit) => {
						acc[unit.id] = unit
						return acc
					},
					{} as Record<string, Unit>
				),
				unitList: units.map(unit => unit.id),
				hasFetched: true
			}),

		setLoading: loading => set({ isLoading: loading }),

		setCurrentPropertyId: propertyId => set({ currentPropertyId: propertyId }),

		setCurrentStatus: status => set({ currentStatus: status }),

		clear: () =>
			set({
				currentUnit: null,
				selectedUnitId: null,
				units: {},
				unitList: [],
				isLoading: false,
				hasFetched: false,
				currentPropertyId: null,
				currentStatus: null
			})
	}))
)
