/**
 * Unit Tests for Terms Step Component
 *
 * Feature: lease-creation-wizard
 * Tests: Basic input behavior and value display
 *
 * Note: Input validation (bounds, formats) is handled by Zod schemas in
 * @repo/shared/validation/lease-wizard.schemas.ts and tested there.
 * This component test verifies UI behavior only.
 */

import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TermsStep } from '../terms-step'
import type { TermsStepData } from '@repo/shared/validation/lease-wizard.schemas'

describe('TermsStep', () => {
	const defaultData: Partial<TermsStepData> = {}

	function renderTermsStep(
		data: Partial<TermsStepData> = defaultData,
		onChange = vi.fn()
	) {
		return {
			...render(<TermsStep data={data} onChange={onChange} />),
			onChange
		}
	}

	describe('Renders all fields', () => {
		it('should render date fields', () => {
			renderTermsStep()

			expect(screen.getByLabelText(/start date/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/end date/i)).toBeInTheDocument()
		})

		it('should render financial fields', () => {
			renderTermsStep()

			expect(screen.getByLabelText(/monthly rent/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/security deposit/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/late fee/i)).toBeInTheDocument()
		})

		it('should render payment configuration fields', () => {
			renderTermsStep()

			expect(screen.getByLabelText(/monthly due date/i)).toBeInTheDocument()
			expect(screen.getByLabelText(/grace period/i)).toBeInTheDocument()
		})
	})

	describe('Currency Input Behavior', () => {
		it('should allow typing in rent field', async () => {
			const user = userEvent.setup()
			const { onChange } = renderTermsStep()

			const input = screen.getByLabelText(/monthly rent/i)
			await user.type(input, '1500')

			expect(onChange).toHaveBeenCalled()
		})

		it('should display cents as dollars', () => {
			renderTermsStep({ rent_amount: 150000 }) // 1500.00 in cents

			const input = screen.getByLabelText(/monthly rent/i)
			expect(input).toHaveValue('1500')
		})

		it('should display security deposit in dollars', () => {
			renderTermsStep({ security_deposit: 200000 }) // 2000.00 in cents

			const input = screen.getByLabelText(/security deposit/i)
			expect(input).toHaveValue('2000')
		})

		it('should display late fee in dollars', () => {
			renderTermsStep({ late_fee_amount: 5000 }) // 50.00 in cents

			const input = screen.getByLabelText(/late fee/i)
			expect(input).toHaveValue('50')
		})
	})

	describe('Integer Input Behavior', () => {
		it('should allow typing in payment day field', async () => {
			const user = userEvent.setup()
			const { onChange } = renderTermsStep()

			const input = screen.getByLabelText(/monthly due date/i)
			await user.type(input, '15')

			expect(onChange).toHaveBeenCalled()
		})

		it('should display existing payment day', () => {
			renderTermsStep({ payment_day: 15 })

			const input = screen.getByLabelText(/monthly due date/i)
			expect(input).toHaveValue('15')
		})

		it('should display existing grace period', () => {
			renderTermsStep({ grace_period_days: 5 })

			const input = screen.getByLabelText(/grace period/i)
			expect(input).toHaveValue('5')
		})
	})

	describe('Date Input Behavior', () => {
		it('should display existing start date', () => {
			renderTermsStep({ start_date: '2025-01-01' })

			const input = screen.getByLabelText(/start date/i)
			expect(input).toHaveValue('2025-01-01')
		})

		it('should display existing end date', () => {
			renderTermsStep({ end_date: '2025-12-31' })

			const input = screen.getByLabelText(/end date/i)
			expect(input).toHaveValue('2025-12-31')
		})
	})

	describe('Input Modes', () => {
		it('should use decimal inputMode for currency fields', () => {
			renderTermsStep()

			expect(screen.getByLabelText(/monthly rent/i)).toHaveAttribute(
				'inputMode',
				'decimal'
			)
			expect(screen.getByLabelText(/security deposit/i)).toHaveAttribute(
				'inputMode',
				'decimal'
			)
			expect(screen.getByLabelText(/late fee/i)).toHaveAttribute(
				'inputMode',
				'decimal'
			)
		})

		it('should use numeric inputMode for integer fields', () => {
			renderTermsStep()

			expect(screen.getByLabelText(/monthly due date/i)).toHaveAttribute(
				'inputMode',
				'numeric'
			)
			expect(screen.getByLabelText(/grace period/i)).toHaveAttribute(
				'inputMode',
				'numeric'
			)
		})

		it('should use text type for numeric fields (allows direct typing)', () => {
			renderTermsStep()

			expect(screen.getByLabelText(/monthly rent/i)).toHaveAttribute(
				'type',
				'text'
			)
			expect(screen.getByLabelText(/monthly due date/i)).toHaveAttribute(
				'type',
				'text'
			)
		})
	})

	describe('Helper Text', () => {
		it('should show optional field descriptions', () => {
			renderTermsStep()

			// Security deposit and late fee both have "Optional, defaults to $0"
			expect(screen.getAllByText(/optional, defaults to \$0/i)).toHaveLength(2)
			expect(screen.getByText(/day rent is due/i)).toBeInTheDocument()
			expect(screen.getByText(/days before late fee/i)).toBeInTheDocument()
		})
	})
})
