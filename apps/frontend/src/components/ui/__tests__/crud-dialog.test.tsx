'use client'

import { describe, expect, it, vi } from 'vitest'
import { render, screen, userEvent } from '#test/utils/test-render'
import { CrudDialog, CrudDialogBody } from '../crud-dialog'
import {
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogClose
} from '../dialog'
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
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Store Title</DialogTitle>
					</DialogHeader>
					<CrudDialogBody>Store Body</CrudDialogBody>
					<DialogFooter>
						<DialogClose asChild>
							<button>Close</button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
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
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Dialog Title</DialogTitle>
					</DialogHeader>
					<CrudDialogBody>Dialog Body</CrudDialogBody>
				</DialogContent>
			</CrudDialog>
		)

		expect(screen.getByText('Dialog Body')).toBeInTheDocument()
	})

	it('calls onOpenChange when dialog closes', async () => {
		const onOpenChange = vi.fn()

		render(
			<CrudDialog mode="create" open onOpenChange={onOpenChange}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Test Title</DialogTitle>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<button>Cancel</button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</CrudDialog>
		)

		const closeButtons = screen.getAllByRole('button', { name: 'Cancel' })
		await userEvent.click(closeButtons[0]!)
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
