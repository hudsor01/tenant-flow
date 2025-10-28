/**
 * @jest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

// Import the component under test (relative to avoid alias parsing issues)
import ReportLibraryPage from '../page'

// Mock reportsClient
jest.mock('@/lib/api/reports-client', () => ({
	reportsClient: {
		listReports: jest.fn(),
		downloadReport: jest.fn(),
		deleteReport: jest.fn()
	}
}))

// Mock sonner toast
jest.mock('sonner', () => ({
	toast: {
		success: jest.fn(),
		error: jest.fn()
	}
}))

import * as realReportsClient from '#lib/api/reports-client'
import { toast } from 'sonner'

const fakeReports = () => ({
	success: true,
	data: [
		{
			id: 'r1',
			userId: 'u1',
			reportType: 'executive-monthly',
			reportName: 'Executive Report',
			format: 'pdf',
			status: 'completed',
			fileUrl: 'https://example.com/r1.pdf',
			filePath: null,
			fileSize: 1024,
			startDate: new Date().toISOString(),
			endDate: new Date().toISOString(),
			metadata: {},
			errorMessage: null,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}
	],
	pagination: {
		total: 1,
		limit: 20,
		offset: 0,
		hasMore: false
	}
})

describe('ReportLibraryPage', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		// Set default mock implementations
		;(
			realReportsClient.reportsClient.listReports as jest.Mock
		).mockResolvedValue(fakeReports())
		;(
			realReportsClient.reportsClient.downloadReport as jest.Mock
		).mockResolvedValue(undefined)
		;(
			realReportsClient.reportsClient.deleteReport as jest.Mock
		).mockResolvedValue(undefined)
	})

	it('renders loading state then reports list', async () => {
		const qc = new QueryClient()
		render(
			React.createElement(
				QueryClientProvider,
				{ client: qc },
				React.createElement(ReportLibraryPage)
			)
		)

		expect(screen.getByText(/Loading reports.../i)).toBeInTheDocument()

		await waitFor(() =>
			expect(realReportsClient.reportsClient.listReports).toHaveBeenCalled()
		)

		// After load, report name should be visible
		expect(await screen.findByText(/Executive Report/i)).toBeInTheDocument()
	})

	it('downloads report when Download clicked', async () => {
		const qc = new QueryClient()
		render(
			React.createElement(
				QueryClientProvider,
				{ client: qc },
				React.createElement(ReportLibraryPage)
			)
		)

		// Wait for list to load
		expect(await screen.findByText(/Executive Report/i)).toBeInTheDocument()

		const downloadButton = screen.getByRole('button', { name: /Download/i })
		await userEvent.click(downloadButton)

		await waitFor(() =>
			expect(
				realReportsClient.reportsClient.downloadReport
			).toHaveBeenCalledWith('r1')
		)
		expect(toast.success).toHaveBeenCalledWith('Report downloaded successfully')
	})

	it('deletes a report when confirmed', async () => {
		const qc = new QueryClient()
		render(
			React.createElement(
				QueryClientProvider,
				{ client: qc },
				React.createElement(ReportLibraryPage)
			)
		)

		// Wait for list to load
		expect(await screen.findByText(/Executive Report/i)).toBeInTheDocument()

		const deleteButton = screen.getByRole('button', { name: /Delete/i })
		await userEvent.click(deleteButton)

		// Confirmation dialog should appear - find the Delete action button
		const confirmDelete = await screen.findByRole('button', { name: /Delete/i })
		// Click confirm
		await userEvent.click(confirmDelete)

		await waitFor(() =>
			expect(realReportsClient.reportsClient.deleteReport).toHaveBeenCalledWith(
				'r1'
			)
		)
		expect(toast.success).toHaveBeenCalledWith('Report deleted successfully')
	})
})
