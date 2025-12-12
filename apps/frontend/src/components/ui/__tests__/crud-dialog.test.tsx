'use client'

import { describe, expect, it, vi } from 'vitest'
import { render, screen, userEvent } from '#test/utils/test-render'
import {
	CrudDialog,
	CrudDialogBody,
	CrudDialogContent,
	CrudDialogFooter,
	CrudDialogHeader,
	CrudDialogTitle,
	CrudDialogClose
} from '../crud-dialog'
import { useModalStore } from '#stores/modal-store'

vi.mock('next/navigation', () => ({
	useRouter: () => ({ back: vi.fn() })
}))

describe('CrudDialog', () => {
	it('opens via modal store and closes on close trigger', async () => {
		const modalId = 'crud-modal-store'
		useModalStore.getState().openModal(modalId)

		render(
			<CrudDialog mode="read" modalId={modalId}>
				<CrudDialogContent>
					<CrudDialogHeader>
						<CrudDialogTitle>Store Title</CrudDialogTitle>
					</CrudDialogHeader>
					<CrudDialogBody>Store Body</CrudDialogBody>
					<CrudDialogFooter>
						<CrudDialogClose asChild>
							<button>Close</button>
						</CrudDialogClose>
					</CrudDialogFooter>
				</CrudDialogContent>
			</CrudDialog>
		)

		expect(screen.getByText('Store Body')).toBeInTheDocument()
		// Click the footer Close button (first match), not the X icon close button
		const closeButtons = screen.getAllByRole('button', { name: 'Close' })
		await userEvent.click(closeButtons[0]!)

		expect(useModalStore.getState().isModalOpen(modalId)).toBe(false)
	})

	it('renders controlled dialog without modal store', () => {
		render(
			<CrudDialog mode="create" open>
				<CrudDialogContent>
					<CrudDialogHeader>
						<CrudDialogTitle>Dialog Title</CrudDialogTitle>
					</CrudDialogHeader>
					<CrudDialogBody>Dialog Body</CrudDialogBody>
				</CrudDialogContent>
			</CrudDialog>
		)

		expect(screen.getByText('Dialog Body')).toBeInTheDocument()
	})

	it('calls onOpenChange when dialog closes', async () => {
		const onOpenChange = vi.fn()

		render(
			<CrudDialog mode="create" open onOpenChange={onOpenChange}>
				<CrudDialogContent>
					<CrudDialogHeader>
						<CrudDialogTitle>Test Title</CrudDialogTitle>
					</CrudDialogHeader>
					<CrudDialogFooter>
						<CrudDialogClose asChild>
							<button>Cancel</button>
						</CrudDialogClose>
					</CrudDialogFooter>
				</CrudDialogContent>
			</CrudDialog>
		)

		const closeButtons = screen.getAllByRole('button', { name: 'Cancel' })
		await userEvent.click(closeButtons[0]!)
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
