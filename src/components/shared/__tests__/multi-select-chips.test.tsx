/**
 * Unit tests for the MultiSelectChips primitive (Phase 63 + cycle-1
 * follow-up M-3). Pins the trigger summary, popover toggle behaviour,
 * and the new Clear/Done footer affordances.
 */

import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MultiSelectChips } from '../multi-select-chips'

const OPTIONS = [
	{ value: 'lease' as const, label: 'Lease' },
	{ value: 'receipt' as const, label: 'Receipt' },
	{ value: 'insurance' as const, label: 'Insurance' }
]

describe('MultiSelectChips', () => {
	it('renders the placeholder when nothing is selected', () => {
		render(
			<MultiSelectChips
				options={OPTIONS}
				value={[]}
				onChange={vi.fn()}
				placeholder="All categories"
				aria-label="Filter by category"
			/>
		)
		const trigger = screen.getByLabelText('Filter by category')
		expect(trigger).toHaveTextContent('All categories')
	})

	it('renders the single-label summary when exactly one is selected', () => {
		render(
			<MultiSelectChips
				options={OPTIONS}
				value={['receipt']}
				onChange={vi.fn()}
				placeholder="All categories"
				aria-label="Filter by category"
			/>
		)
		expect(screen.getByLabelText('Filter by category')).toHaveTextContent(
			'Receipt'
		)
	})

	it('renders the count summary when multiple are selected', () => {
		render(
			<MultiSelectChips
				options={OPTIONS}
				value={['lease', 'receipt']}
				onChange={vi.fn()}
				placeholder="All categories"
				aria-label="Filter by category"
			/>
		)
		expect(screen.getByLabelText('Filter by category')).toHaveTextContent(
			'2 selected'
		)
	})

	it('toggling an option calls onChange with the new array', async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		render(
			<MultiSelectChips
				options={OPTIONS}
				value={['lease']}
				onChange={onChange}
				aria-label="Filter by category"
			/>
		)
		await user.click(screen.getByLabelText('Filter by category'))
		await user.click(screen.getByRole('option', { name: /receipt/i }))
		expect(onChange).toHaveBeenCalledWith(['lease', 'receipt'])
	})

	it('Clear button (footer) empties the selection (cycle-1 M-3)', async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		render(
			<MultiSelectChips
				options={OPTIONS}
				value={['lease', 'receipt']}
				onChange={onChange}
				aria-label="Filter by category"
			/>
		)
		await user.click(screen.getByLabelText('Filter by category'))
		await user.click(screen.getByRole('button', { name: /^clear$/i }))
		expect(onChange).toHaveBeenCalledWith([])
	})

	it('Clear button is disabled when nothing is selected (M-3)', async () => {
		const user = userEvent.setup()
		render(
			<MultiSelectChips
				options={OPTIONS}
				value={[]}
				onChange={vi.fn()}
				aria-label="Filter by category"
			/>
		)
		await user.click(screen.getByLabelText('Filter by category'))
		expect(screen.getByRole('button', { name: /^clear$/i })).toBeDisabled()
	})

	it('Done button (footer) closes the popover without modifying selection (M-3)', async () => {
		const user = userEvent.setup()
		const onChange = vi.fn()
		render(
			<MultiSelectChips
				options={OPTIONS}
				value={['lease']}
				onChange={onChange}
				aria-label="Filter by category"
			/>
		)
		await user.click(screen.getByLabelText('Filter by category'))
		// The popover is open: option list visible.
		expect(
			screen.getByRole('option', { name: /^lease$/i })
		).toBeInTheDocument()

		await user.click(screen.getByRole('button', { name: /^done$/i }))

		// onChange must NOT have fired — Done is purely a "close" affordance.
		expect(onChange).not.toHaveBeenCalled()
		// Option list is gone (popover closed).
		expect(
			screen.queryByRole('option', { name: /^lease$/i })
		).not.toBeInTheDocument()
	})

	it('top-right X button (visible when something is selected) clears the selection', async () => {
		const onChange = vi.fn()
		render(
			<MultiSelectChips
				options={OPTIONS}
				value={['lease']}
				onChange={onChange}
				aria-label="Filter by category"
			/>
		)
		fireEvent.click(screen.getByLabelText(/clear selection/i))
		expect(onChange).toHaveBeenCalledWith([])
	})
})
