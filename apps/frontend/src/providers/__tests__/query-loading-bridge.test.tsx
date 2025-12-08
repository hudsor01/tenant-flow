import { render, waitFor } from '@testing-library/react'
import { QueryProvider } from '#providers/query-provider'
import { useQuery } from '@tanstack/react-query'
import { useLoadingStore } from '#stores/loading-store'

const resetLoadingStore = () => {
	useLoadingStore.setState({
		operations: {},
		isLoading: false,
		hasOperations: false,
		activeOperationCount: 0,
		globalProgress: 100
	})
}

function FetchComponent({ onResolved }: { onResolved: () => void }) {
	useQuery({
		queryKey: ['bridge-test'],
		queryFn: () =>
			new Promise<string>(resolve => {
				setTimeout(() => {
					resolve('done')
					onResolved()
				}, 0)
			})
	})
	return null
}

describe('QueryProvider loading bridge', () => {
	beforeEach(() => {
		resetLoadingStore()
	})

	it('mirrors query fetches into the global loading store', async () => {
		let fetchResolved = false

		render(
			<QueryProvider>
				<FetchComponent onResolved={() => (fetchResolved = true)} />
			</QueryProvider>
		)

		await waitFor(() => {
			expect(useLoadingStore.getState().isLoading).toBe(true)
		})

		await waitFor(() => fetchResolved)

		await waitFor(() => {
			expect(useLoadingStore.getState().isLoading).toBe(false)
		})
	})
})
