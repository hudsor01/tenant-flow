/**
 * Tests for PaymentOptionCard component
 * Requirements: 4.1, 4.2, 4.3
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { PaymentOptionCard } from '../payment-option-card'

describe('PaymentOptionCard', () => {
	it('renders both payment options with descriptions (4.1)', () => {
		render(
			<PaymentOptionCard
				title="Add Payment Method"
				description="Save a card or bank account for one-time payments or autopay"
				pros={['Convenient autopay setup', 'Card rewards', 'Instant payments']}
				cons={['Processing fees apply', 'Card limits may apply']}
			/>
		)

		expect(screen.getByText('Add Payment Method')).toBeInTheDocument()
		expect(
			screen.getByText(
				'Save a card or bank account for one-time payments or autopay'
			)
		).toBeInTheDocument()
	})

	it('displays recommended badge when recommended prop is true (4.2)', () => {
		render(
			<PaymentOptionCard
				title="Add Payment Method"
				description="Best for autopay"
				pros={[]}
				cons={[]}
				recommended={true}
			/>
		)

		// Look for the badge specifically
		const badge = screen.getByRole('status')
		expect(badge).toHaveTextContent('Recommended')
	})

	it('does not display recommended badge when recommended prop is false', () => {
		render(
			<PaymentOptionCard
				title="Stripe Connect"
				description="Direct bank connection"
				pros={[]}
				cons={[]}
				recommended={false}
			/>
		)

		expect(screen.queryByText(/recommended/i)).not.toBeInTheDocument()
	})

	it('has expandable pros/cons section (4.3)', async () => {
		const user = userEvent.setup()

		render(
			<PaymentOptionCard
				title="Add Payment Method"
				description="Test description"
				pros={['Pro 1', 'Pro 2']}
				cons={['Con 1', 'Con 2']}
			/>
		)

		// Pros and cons should not be visible initially
		expect(screen.queryByText('Pro 1')).not.toBeInTheDocument()
		expect(screen.queryByText('Con 1')).not.toBeInTheDocument()

		// Find and click the expand button
		const expandButton = screen.getByRole('button', {
			name: /details|more|expand/i
		})
		await user.click(expandButton)

		// Pros and cons should now be visible
		expect(screen.getByText('Pro 1')).toBeInTheDocument()
		expect(screen.getByText('Pro 2')).toBeInTheDocument()
		expect(screen.getByText('Con 1')).toBeInTheDocument()
		expect(screen.getByText('Con 2')).toBeInTheDocument()
	})

	it('includes data-tour attribute for tour integration', () => {
		const { container } = render(
			<PaymentOptionCard
				title="Add Payment Method"
				description="Test"
				pros={[]}
				cons={[]}
				tourId="payment-options"
			/>
		)

		const element = container.querySelector('[data-tour="payment-options"]')
		expect(element).toBeInTheDocument()
	})
})
