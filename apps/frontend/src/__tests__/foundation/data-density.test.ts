/**
 * Foundation Layer Tests - Data Density Preferences
 *
 * Tests that data density preferences persist to localStorage
 * and can be retrieved correctly across sessions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
	createPreferencesStore,
	getStoredDataDensity,
	persistDataDensity,
	DATA_DENSITY_STORAGE_KEY,
	DEFAULT_DATA_DENSITY,
	type DataDensity
} from '#stores/preferences-store'

describe('data density preferences', () => {
	let mockLocalStorage: Record<string, string>

	beforeEach(() => {
		// Mock localStorage
		mockLocalStorage = {}
		vi.stubGlobal('localStorage', {
			getItem: vi.fn((key: string) => mockLocalStorage[key] || null),
			setItem: vi.fn((key: string, value: string) => {
				mockLocalStorage[key] = value
			}),
			removeItem: vi.fn((key: string) => {
				delete mockLocalStorage[key]
			}),
			clear: vi.fn(() => {
				mockLocalStorage = {}
			})
		})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('should default to comfortable density', () => {
		const store = createPreferencesStore()
		const state = store.getState()

		expect(state.dataDensity).toBe('comfortable')
		expect(DEFAULT_DATA_DENSITY).toBe('comfortable')
	})

	it('should persist data density to localStorage when changed', () => {
		const store = createPreferencesStore()

		store.getState().setDataDensity('compact')

		expect(localStorage.setItem).toHaveBeenCalledWith(
			DATA_DENSITY_STORAGE_KEY,
			'compact'
		)
		expect(store.getState().dataDensity).toBe('compact')
	})

	it('should retrieve stored data density from localStorage', () => {
		mockLocalStorage[DATA_DENSITY_STORAGE_KEY] = 'spacious'

		const storedDensity = getStoredDataDensity()

		expect(storedDensity).toBe('spacious')
	})

	it('should return null for invalid stored values', () => {
		mockLocalStorage[DATA_DENSITY_STORAGE_KEY] = 'invalid-value'

		const storedDensity = getStoredDataDensity()

		expect(storedDensity).toBeNull()
	})

	it('should cycle through all density values', () => {
		const store = createPreferencesStore()
		const densities: DataDensity[] = ['compact', 'comfortable', 'spacious']

		densities.forEach(density => {
			store.getState().setDataDensity(density)
			expect(store.getState().dataDensity).toBe(density)
		})
	})

	it('should persist data density correctly', () => {
		persistDataDensity('compact')

		expect(localStorage.setItem).toHaveBeenCalledWith(
			DATA_DENSITY_STORAGE_KEY,
			'compact'
		)
	})

	it('should initialize with provided data density', () => {
		const store = createPreferencesStore({ dataDensity: 'spacious' })

		expect(store.getState().dataDensity).toBe('spacious')
	})
})
