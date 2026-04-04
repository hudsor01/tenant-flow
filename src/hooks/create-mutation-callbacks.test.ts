import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { QueryClient } from '@tanstack/react-query'

const mockToastSuccess = vi.hoisted(() => vi.fn())
const mockHandleMutationError = vi.hoisted(() => vi.fn())
const mockHandleMutationSuccess = vi.hoisted(() => vi.fn())

vi.mock('sonner', () => ({
	toast: { success: mockToastSuccess }
}))

vi.mock('#lib/mutation-error-handler', () => ({
	handleMutationError: mockHandleMutationError,
	handleMutationSuccess: mockHandleMutationSuccess
}))

import { createMutationCallbacks } from './create-mutation-callbacks'

type MockQueryClient = Pick<
	QueryClient,
	| 'invalidateQueries'
	| 'setQueryData'
	| 'removeQueries'
	| 'cancelQueries'
	| 'getQueryData'
	| 'getQueriesData'
>

function createMockQueryClient(): MockQueryClient {
	return {
		invalidateQueries: vi.fn(),
		setQueryData: vi.fn(),
		removeQueries: vi.fn(),
		cancelQueries: vi.fn(),
		getQueryData: vi.fn(),
		getQueriesData: vi.fn()
	}
}

/** Cast mock to QueryClient for createMutationCallbacks */
function asQueryClient(mock: MockQueryClient): QueryClient {
	return mock as unknown as QueryClient
}

describe('createMutationCallbacks', () => {
	let qc: ReturnType<typeof createMockQueryClient>

	beforeEach(() => {
		vi.clearAllMocks()
		qc = createMockQueryClient()
	})

	describe('Tier 1 + Tier 2 (standard callbacks)', () => {
		it('onSuccess calls invalidateQueries for each key in invalidate array', () => {
			const callbacks = createMutationCallbacks(asQueryClient(qc), {
				invalidate: [['a'], ['b', 'c']],
				errorContext: 'Test'
			})

			callbacks.onSuccess({ id: '1' }, undefined)

			expect(qc.invalidateQueries).toHaveBeenCalledTimes(2)
			expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['a'] })
			expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['b', 'c'] })
		})

		it('onSuccess calls toast.success with successMessage when provided', () => {
			const callbacks = createMutationCallbacks(asQueryClient(qc), {
				invalidate: [],
				successMessage: 'Created!',
				errorContext: 'Test'
			})

			callbacks.onSuccess({ id: '1' }, undefined)

			expect(mockToastSuccess).toHaveBeenCalledWith('Created!')
		})

		it('onSuccess does NOT call toast when successMessage is omitted', () => {
			const callbacks = createMutationCallbacks(asQueryClient(qc), {
				invalidate: [],
				errorContext: 'Test'
			})

			callbacks.onSuccess({ id: '1' }, undefined)

			expect(mockToastSuccess).not.toHaveBeenCalled()
		})

		it('onError calls handleMutationError with error and errorContext', () => {
			const callbacks = createMutationCallbacks(asQueryClient(qc), {
				invalidate: [],
				errorContext: 'Create widget'
			})

			const err = new Error('fail')
			callbacks.onError(err)

			expect(mockHandleMutationError).toHaveBeenCalledWith(err, 'Create widget')
		})

		it('onSuccess calls setQueryData when updateDetail config is provided (Tier 2)', () => {
			const callbacks = createMutationCallbacks<{ id: string }>(
				asQueryClient(qc),
				{
					invalidate: [],
					errorContext: 'Test',
					updateDetail: (data) => ({
						queryKey: ['items', data.id],
						data
					})
				}
			)

			const data = { id: '42' }
			callbacks.onSuccess(data, undefined)

			expect(qc.setQueryData).toHaveBeenCalledWith(['items', '42'], data)
		})

		it('onSuccess calls removeQueries when removeDetail config is provided', () => {
			const callbacks = createMutationCallbacks<
				{ id: string },
				{ deletedId: string }
			>(asQueryClient(qc), {
				invalidate: [],
				errorContext: 'Test',
				removeDetail: (_data, vars) => ['items', vars.deletedId]
			})

			callbacks.onSuccess({ id: '1' }, { deletedId: '99' })

			expect(qc.removeQueries).toHaveBeenCalledWith({
				queryKey: ['items', '99']
			})
		})

		it('onSuccess calls onSuccessExtra callback after standard operations', () => {
			const extra = vi.fn()
			const callbacks = createMutationCallbacks(asQueryClient(qc), {
				invalidate: [['a']],
				successMessage: 'Done',
				errorContext: 'Test',
				onSuccessExtra: extra
			})

			const data = { id: '1' }
			callbacks.onSuccess(data, undefined)

			expect(extra).toHaveBeenCalledWith(data)
			expect(qc.invalidateQueries).toHaveBeenCalled()
			expect(mockToastSuccess).toHaveBeenCalled()
		})

		it('onSuccess calls handleMutationSuccess instead of toast.success when broadcastSuccess is true', () => {
			const callbacks = createMutationCallbacks(asQueryClient(qc), {
				invalidate: [],
				successMessage: 'Saved!',
				errorContext: 'Save item',
				broadcastSuccess: true
			})

			callbacks.onSuccess({ id: '1' }, undefined)

			expect(mockHandleMutationSuccess).toHaveBeenCalledWith('Save item', 'Saved!')
			expect(mockToastSuccess).not.toHaveBeenCalled()
		})
	})

	describe('Tier 3 (optimistic callbacks)', () => {
		it('onMutate calls cancelQueries for each cancel key', async () => {
			const callbacks = createMutationCallbacks<
				{ id: string },
				{ id: string },
				Record<string, unknown>
			>(asQueryClient(qc), {
				invalidate: [],
				errorContext: 'Test',
				optimistic: {
					cancel: [['a'], ['b']],
					snapshot: () => ({}),
					rollback: () => undefined
				}
			})

			await callbacks.onMutate({ id: '1' })

			expect(qc.cancelQueries).toHaveBeenCalledTimes(2)
			expect(qc.cancelQueries).toHaveBeenCalledWith({ queryKey: ['a'] })
			expect(qc.cancelQueries).toHaveBeenCalledWith({ queryKey: ['b'] })
		})

		it('onMutate calls snapshot function and returns its result as context', async () => {
			const snapshotResult = { prev: 'data' }
			const callbacks = createMutationCallbacks<
				{ id: string },
				{ id: string },
				{ prev: string }
			>(asQueryClient(qc), {
				invalidate: [],
				errorContext: 'Test',
				optimistic: {
					cancel: [],
					snapshot: () => snapshotResult,
					rollback: () => undefined
				}
			})

			const context = await callbacks.onMutate({ id: '1' })
			expect(context).toBe(snapshotResult)
		})

		it('onMutate calls apply function with queryClient and variables when provided', async () => {
			const applyFn = vi.fn()
			const callbacks = createMutationCallbacks<
				{ id: string },
				{ id: string },
				Record<string, unknown>
			>(asQueryClient(qc), {
				invalidate: [],
				errorContext: 'Test',
				optimistic: {
					cancel: [],
					snapshot: () => ({}),
					rollback: () => undefined,
					apply: applyFn
				}
			})

			const vars = { id: '1' }
			await callbacks.onMutate(vars)

			expect(applyFn).toHaveBeenCalledWith(qc, vars)
		})

		it('onError calls rollback with queryClient and context when optimistic config provided', () => {
			const rollbackFn = vi.fn()
			const callbacks = createMutationCallbacks<
				{ id: string },
				{ id: string },
				{ old: boolean }
			>(asQueryClient(qc), {
				invalidate: [],
				errorContext: 'Opt test',
				optimistic: {
					cancel: [],
					snapshot: () => ({ old: true }),
					rollback: rollbackFn
				}
			})

			const ctx = { old: true }
			const vars = { id: '1' }
			callbacks.onError(new Error('fail'), vars, ctx)

			expect(rollbackFn).toHaveBeenCalledWith(qc, ctx, vars)
			expect(mockHandleMutationError).toHaveBeenCalledWith(
				expect.any(Error),
				'Opt test'
			)
		})

		it('onSettled calls invalidateQueries for all invalidate keys', () => {
			const callbacks = createMutationCallbacks<
				{ id: string },
				{ id: string },
				Record<string, unknown>
			>(asQueryClient(qc), {
				invalidate: [['x'], ['y', 'z']],
				errorContext: 'Test',
				optimistic: {
					cancel: [],
					snapshot: () => ({}),
					rollback: () => undefined
				}
			})

			callbacks.onSettled(undefined, undefined, { id: 'test' })

			expect(qc.invalidateQueries).toHaveBeenCalledTimes(2)
			expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['x'] })
			expect(qc.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['y', 'z'] })
		})

		it('when optimistic config provided, onSuccess does NOT invalidate (onSettled handles it)', () => {
			const callbacks = createMutationCallbacks<
				{ id: string },
				{ id: string },
				Record<string, unknown>
			>(asQueryClient(qc), {
				invalidate: [['a']],
				errorContext: 'Test',
				optimistic: {
					cancel: [],
					snapshot: () => ({}),
					rollback: () => undefined
				}
			})

			callbacks.onSuccess({ id: '1' })

			expect(qc.invalidateQueries).not.toHaveBeenCalled()
		})

		it('onMutate resolves cancel as function when cancel is a function', async () => {
			const cancelFn = vi.fn().mockReturnValue([['dynamic', '1']])
			const callbacks = createMutationCallbacks<
				{ id: string },
				{ id: string },
				Record<string, unknown>
			>(asQueryClient(qc), {
				invalidate: [],
				errorContext: 'Test',
				optimistic: {
					cancel: cancelFn,
					snapshot: () => ({}),
					rollback: () => undefined
				}
			})

			const vars = { id: '1' }
			await callbacks.onMutate(vars)

			expect(cancelFn).toHaveBeenCalledWith(vars)
			expect(qc.cancelQueries).toHaveBeenCalledWith({
				queryKey: ['dynamic', '1']
			})
		})
	})
})
