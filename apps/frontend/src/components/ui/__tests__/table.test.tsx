/**
 * @vitest-environment jsdom
 * Table Component Tests
 *
 * Tests the critical fix: TableCell does NOT have whitespace-nowrap class,
 * allowing multi-line content (like flex-col layouts) to render properly.
 *
 * Key behaviors tested:
 * 1. TableCell allows multi-line content (flex-col)
 * 2. TableHead retains whitespace-nowrap (headers should stay single-line)
 * 3. Basic table structure renders correctly
 * 4. Custom className prop is merged correctly
 */

import { render, screen } from '#test/utils/test-render'
import { describe, test, expect } from 'vitest'
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow
} from '../table'

describe('Table Component', () => {
	describe('Basic Rendering', () => {
		test('renders table with all parts', () => {
			render(
				<Table>
					<TableCaption>Test Caption</TableCaption>
					<TableHeader>
						<TableRow>
							<TableHead>Header 1</TableHead>
							<TableHead>Header 2</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow>
							<TableCell>Cell 1</TableCell>
							<TableCell>Cell 2</TableCell>
						</TableRow>
					</TableBody>
					<TableFooter>
						<TableRow>
							<TableCell>Footer 1</TableCell>
							<TableCell>Footer 2</TableCell>
						</TableRow>
					</TableFooter>
				</Table>
			)

			expect(screen.getByText('Test Caption')).toBeInTheDocument()
			expect(screen.getByText('Header 1')).toBeInTheDocument()
			expect(screen.getByText('Header 2')).toBeInTheDocument()
			expect(screen.getByText('Cell 1')).toBeInTheDocument()
			expect(screen.getByText('Cell 2')).toBeInTheDocument()
			expect(screen.getByText('Footer 1')).toBeInTheDocument()
			expect(screen.getByText('Footer 2')).toBeInTheDocument()
		})

		test('renders table role correctly', () => {
			render(
				<Table>
					<TableBody>
						<TableRow>
							<TableCell>Test</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			)

			expect(screen.getByRole('table')).toBeInTheDocument()
		})
	})

	describe('TableCell - Multi-line Content Support', () => {
		test('TableCell does NOT have whitespace-nowrap class', () => {
			render(
				<Table>
					<TableBody>
						<TableRow>
							<TableCell data-testid="test-cell">Content</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			)

			const cell = screen.getByTestId('test-cell')
			expect(cell).not.toHaveClass('whitespace-nowrap')
		})

		test('TableCell renders multi-line flex-col content correctly', () => {
			render(
				<Table>
					<TableBody>
						<TableRow>
							<TableCell data-testid="multiline-cell">
								<div className="flex flex-col">
									<span>Line 1</span>
									<span>Line 2</span>
								</div>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			)

			const cell = screen.getByTestId('multiline-cell')
			expect(cell).toBeInTheDocument()
			expect(screen.getByText('Line 1')).toBeInTheDocument()
			expect(screen.getByText('Line 2')).toBeInTheDocument()
		})

		test('TableCell with Unit-style content (property details) renders properly', () => {
			// This mimics the actual use case in leases table columns
			render(
				<Table>
					<TableBody>
						<TableRow>
							<TableCell data-testid="unit-cell">
								<div className="flex flex-col">
									<span className="font-medium">Unit 101</span>
									<span className="text-sm text-muted-foreground">2 bd · 1 ba</span>
								</div>
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			)

			expect(screen.getByText('Unit 101')).toBeInTheDocument()
			expect(screen.getByText('2 bd · 1 ba')).toBeInTheDocument()
		})

		test('TableCell accepts custom className and merges it', () => {
			render(
				<Table>
					<TableBody>
						<TableRow>
							<TableCell className="custom-class" data-testid="custom-cell">
								Content
							</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			)

			const cell = screen.getByTestId('custom-cell')
			expect(cell).toHaveClass('custom-class')
			expect(cell).toHaveClass('p-2') // Base class
			expect(cell).toHaveClass('align-middle') // Base class
		})
	})

	describe('TableHead - Single-line Headers', () => {
		test('TableHead has whitespace-nowrap class', () => {
			render(
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead data-testid="test-head">Header</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow>
							<TableCell>Cell</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			)

			const head = screen.getByTestId('test-head')
			expect(head).toHaveClass('whitespace-nowrap')
		})

		test('TableHead accepts custom className and merges it', () => {
			render(
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="custom-header" data-testid="custom-head">
								Header
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						<TableRow>
							<TableCell>Cell</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			)

			const head = screen.getByTestId('custom-head')
			expect(head).toHaveClass('custom-header')
			expect(head).toHaveClass('whitespace-nowrap')
		})
	})

	describe('Data Slots', () => {
		test('Table has correct data-slot attributes', () => {
			render(
				<Table data-testid="table">
					<TableHeader data-testid="header">
						<TableRow data-testid="header-row">
							<TableHead data-testid="head">Header</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody data-testid="body">
						<TableRow data-testid="body-row">
							<TableCell data-testid="cell">Cell</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			)

			// These data-slot attributes help with styling and testing
			// Table component wraps in a container, so we get the actual table element
			expect(screen.getByRole('table')).toHaveAttribute('data-slot', 'table')
			expect(screen.getByTestId('header')).toHaveAttribute('data-slot', 'table-header')
			expect(screen.getByTestId('body')).toHaveAttribute('data-slot', 'table-body')
			expect(screen.getByTestId('header-row')).toHaveAttribute('data-slot', 'table-row')
			expect(screen.getByTestId('body-row')).toHaveAttribute('data-slot', 'table-row')
			expect(screen.getByTestId('head')).toHaveAttribute('data-slot', 'table-head')
			expect(screen.getByTestId('cell')).toHaveAttribute('data-slot', 'table-cell')
		})
	})

	describe('Overflow Handling', () => {
		test('Table container has overflow-x-auto for horizontal scroll', () => {
			render(
				<Table data-testid="table">
					<TableBody>
						<TableRow>
							<TableCell>Cell</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			)

			// The container div wrapping the table
			const container = screen.getByTestId('table').closest('[data-slot="table-container"]')
			expect(container).toHaveClass('overflow-x-auto')
		})
	})

	describe('Accessibility', () => {
		test('TableRow has correct hover states', () => {
			render(
				<Table>
					<TableBody>
						<TableRow data-testid="row">
							<TableCell>Cell</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			)

			const row = screen.getByTestId('row')
			expect(row).toHaveClass('hover:bg-muted/50')
		})

		test('TableRow supports selected state', () => {
			render(
				<Table>
					<TableBody>
						<TableRow data-testid="row" data-state="selected">
							<TableCell>Cell</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			)

			const row = screen.getByTestId('row')
			expect(row).toHaveAttribute('data-state', 'selected')
			// The data-[state=selected]:bg-muted class should apply via CSS
		})
	})

	describe('Edge Cases', () => {
		test('handles empty table body', () => {
			render(
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Header</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody data-testid="empty-body" />
				</Table>
			)

			expect(screen.getByTestId('empty-body')).toBeInTheDocument()
		})

		test('handles table with only caption', () => {
			render(
				<Table>
					<TableCaption>Only Caption</TableCaption>
					<TableBody>
						<TableRow>
							<TableCell>Cell</TableCell>
						</TableRow>
					</TableBody>
				</Table>
			)

			expect(screen.getByText('Only Caption')).toBeInTheDocument()
		})
	})
})
