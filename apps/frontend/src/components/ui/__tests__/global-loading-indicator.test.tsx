import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { GlobalLoadingIndicator } from '../global-loading-indicator'
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

describe('GlobalLoadingIndicator', () => {
	beforeEach(() => {
		resetLoadingStore()
	})

	it('renders a single indicator even with multiple loading operations', () => {
		render(<GlobalLoadingIndicator />)

		act(() => {
			const store = useLoadingStore.getState()
			store.startLoading('op-1', 'Fetch A')
			store.startLoading('op-2', 'Fetch B')
		})

		const indicators = screen.getAllByTestId('global-loading-indicator')
		expect(indicators).toHaveLength(1)
		expect(screen.getByText(/2 actions in progress/i)).toBeInTheDocument()
	})

	it('provides immediate feedback when loading begins and hides when finished', () => {
		// preload loading state before initial render to ensure immediate feedback
		act(() => {
			const store = useLoadingStore.getState()
			store.startLoading('op-initial')
		})

		render(<GlobalLoadingIndicator />)

		expect(screen.getByTestId('global-loading-indicator')).toBeInTheDocument()

		act(() => {
			useLoadingStore.getState().stopLoading('op-initial')
		})

		// hides promptly after loading completes
		return waitFor(() => {
			expect(
				screen.queryByTestId('global-loading-indicator')
			).not.toBeInTheDocument()
		})
	})
})
