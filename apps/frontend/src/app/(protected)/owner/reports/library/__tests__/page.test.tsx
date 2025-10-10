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


import * as realReportsClient from '@/lib/api/reports-client'
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
	let reportsClient: typeof realReportsClient.reportsClient
		beforeEach(() => {
			// Create a fresh mock for each test
			reportsClient = {
				...realReportsClient.reportsClient,
				listReports: jest.fn(),
				downloadReport: jest.fn(),
				deleteReport: jest.fn()
			}
			jest.clearAllMocks()
		})

	it('renders loading state then reports list', async () => {
		(reportsClient.listReports as unknown as jest.Mock).mockResolvedValueOnce(fakeReports())

			const qc = new QueryClient()
			render(
				React.createElement(
					QueryClientProvider,
					{ client: qc },
					React.createElement(ReportLibraryPage)
				)
			)

			expect(screen.getByText(/Loading reports.../i)).toBeInTheDocument()

			await waitFor(() => expect(reportsClient.listReports).toHaveBeenCalled())

			// After load, report name should be visible
			expect(await screen.findByText(/Executive Report/i)).toBeInTheDocument()
	})

	it('downloads report when Download clicked', async () => {
		(reportsClient.listReports as unknown as jest.Mock).mockResolvedValueOnce(fakeReports())
		(reportsClient.downloadReport as unknown as jest.Mock).mockResolvedValueOnce(undefined)

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
				expect(reportsClient.downloadReport).toHaveBeenCalledWith('r1')
			)
			expect(toast.success).toHaveBeenCalledWith('Report downloaded successfully')
	})

	it('deletes a report when confirmed', async () => {
		(reportsClient.listReports as unknown as jest.Mock).mockResolvedValueOnce(fakeReports())
		(reportsClient.deleteReport as unknown as jest.Mock).mockResolvedValueOnce(undefined)

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
				expect(reportsClient.deleteReport).toHaveBeenCalledWith('r1')
			)
			expect(toast.success).toHaveBeenCalledWith('Report deleted successfully')
	})
})
