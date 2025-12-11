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
	CrudDialogClose,
	CrudDialogForm
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

	it('renders alternative variant (drawer) content', () => {
		render(
			<CrudDialog mode="create" variant="drawer" open>
				<CrudDialogContent>
					<CrudDialogHeader>
						<CrudDialogTitle>Drawer Title</CrudDialogTitle>
					</CrudDialogHeader>
					<CrudDialogBody>Drawer Body</CrudDialogBody>
				</CrudDialogContent>
			</CrudDialog>
		)

		expect(screen.getByText('Drawer Body')).toBeInTheDocument()
	})

	it('closes when CrudDialogForm submits with closeOnSubmit', async () => {
		const onOpenChange = vi.fn()

		render(
			<CrudDialog mode="create" open onOpenChange={onOpenChange}>
				<CrudDialogContent>
					<CrudDialogForm data-testid="crud-form">
						<button type="submit">Submit</button>
					</CrudDialogForm>
				</CrudDialogContent>
			</CrudDialog>
		)

		await userEvent.click(screen.getByText('Submit'))
		expect(onOpenChange).toHaveBeenCalledWith(false)
	})
})
