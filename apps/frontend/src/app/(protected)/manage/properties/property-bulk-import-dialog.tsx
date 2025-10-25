'use client'

import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { propertiesApi } from '@/lib/api-client'
import { createLogger } from '@repo/shared/lib/frontend-logger'
import { AlertCircle, CheckCircle2, Download, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import * as XLSX from 'xlsx'

const logger = createLogger({ component: 'PropertyBulkImportDialog' })

export function PropertyBulkImportDialog() {
	const router = useRouter()
	const [open, setOpen] = useState(false)
	const [file, setFile] = useState<File | null>(null)
	const [loading, setLoading] = useState(false)
	const [result, setResult] = useState<{
		success: boolean
		imported: number
		failed: number
		errors: Array<{ row: number; error: string }>
	} | null>(null)

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selectedFile = e.target.files?.[0]
		if (selectedFile) {
			// Validate file type
			const validTypes = [
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'application/vnd.ms-excel'
			]
			if (!validTypes.includes(selectedFile.type)) {
				logger.warn('Invalid file type selected', { type: selectedFile.type })
				alert('Please select an Excel file (.xlsx or .xls)')
				return
			}

			// Validate file size (5MB max)
			if (selectedFile.size > 5 * 1024 * 1024) {
				logger.warn('File too large', { size: selectedFile.size })
				alert('File size must be less than 5MB')
				return
			}

			setFile(selectedFile)
			setResult(null)
		}
	}

	const handleUpload = async () => {
		if (!file) return

		setLoading(true)
		setResult(null)

		try {
			logger.info('Starting bulk import', { fileName: file.name })
			const response = await propertiesApi.bulkImport(file)

			logger.info('Bulk import completed', response)
			setResult(response)

			// If successful, refresh the page data
			if (response.success && response.imported > 0) {
				setTimeout(() => {
					router.refresh()
					setOpen(false)
					setFile(null)
					setResult(null)
				}, 3000)
			}
		} catch (error) {
			logger.error('Bulk import failed', { error })
			alert(
				error instanceof Error
					? error.message
					: 'Failed to import properties. Please try again.'
			)
		} finally {
			setLoading(false)
		}
	}

	const downloadTemplate = () => {
		// Create sample Excel template
		const templateData = [
			{
				name: 'Sample Property 1',
				address: '123 Main St',
				city: 'San Francisco',
				state: 'CA',
				zipCode: '94105',
				propertyType: 'APARTMENT',
				description: 'Modern apartment building'
			},
			{
				name: 'Sample Property 2',
				address: '456 Oak Ave',
				city: 'Los Angeles',
				state: 'CA',
				zipCode: '90001',
				propertyType: 'SINGLE_FAMILY',
				description: 'Single family home'
			}
		]

		const worksheet = XLSX.utils.json_to_sheet(templateData)
		const workbook = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(workbook, worksheet, 'Properties')

		// Set column widths
		worksheet['!cols'] = [
			{ wch: 20 }, // name
			{ wch: 25 }, // address
			{ wch: 15 }, // city
			{ wch: 10 }, // state
			{ wch: 10 }, // zipCode
			{ wch: 15 }, // propertyType
			{ wch: 30 } // description
		]

		XLSX.writeFile(workbook, 'property-import-template.xlsx')
		logger.info('Template downloaded')
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline">
					<Upload className="size-4 mr-2" />
					Bulk Import
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Bulk Import Properties</DialogTitle>
					<DialogDescription>
						Upload an Excel file to import multiple properties at once. Maximum
						100 properties per import.
					</DialogDescription>
				</DialogHeader>

				<div className="grid gap-4 py-4">
					{/* Template Download */}
					<div className="flex items-center justify-between p-4 border rounded-lg">
						<div>
							<p className="font-medium">Download Template</p>
							<p className="text-sm text-muted-foreground">
								Get the Excel template with sample data
							</p>
						</div>
						<Button variant="outline" size="sm" onClick={downloadTemplate}>
							<Download className="size-4 mr-2" />
							Download
						</Button>
					</div>

					{/* File Upload */}
					<div className="space-y-2">
						<label
							htmlFor="file-upload"
							className="block text-sm font-medium text-foreground"
						>
							Select Excel File
						</label>
						<input
							id="file-upload"
							type="file"
							accept=".xlsx,.xls"
							onChange={handleFileChange}
							className="block w-full text-sm text-muted-foreground
								file:mr-4 file:py-2 file:px-4
								file:rounded-md file:border-0
								file:text-sm file:font-semibold
								file:bg-primary file:text-primary-foreground
								hover:file:bg-primary/90
								cursor-pointer"
						/>
						{file && (
							<p className="text-sm text-muted-foreground">
								Selected: {file.name} ({(file.size / 1024).toFixed(2)} KB)
							</p>
						)}
					</div>

					{/* Result Display */}
					{result && (
						<div
							className={`p-4 border rounded-lg ${
								result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
							}`}
						>
							<div className="flex items-start gap-3">
								{result.success ? (
									<CheckCircle2 className="size-5 text-green-600 mt-0.5" />
								) : (
									<AlertCircle className="size-5 text-red-600 mt-0.5" />
								)}
								<div className="flex-1 space-y-2">
									<p className="font-medium">
										{result.success ? 'Import Successful!' : 'Import Failed'}
									</p>
									<div className="text-sm space-y-1">
										<p>Imported: {result.imported} properties</p>
										{result.failed > 0 && <p>Failed: {result.failed} rows</p>}
									</div>

									{/* Error Details */}
									{result.errors.length > 0 && (
										<div className="mt-3 space-y-1">
											<p className="font-medium text-sm">Errors:</p>
											<div className="max-h-40 overflow-y-auto space-y-1">
												{result.errors.map((err, idx) => (
													<p key={idx} className="text-xs text-red-700">
														Row {err.row}: {err.error}
													</p>
												))}
											</div>
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Instructions */}
					<div className="p-4 bg-muted rounded-lg space-y-2">
						<p className="font-medium text-sm">Required Fields:</p>
						<ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
							<li>name - Property name</li>
							<li>address - Street address</li>
							<li>city, state, zipCode - Location details</li>
						</ul>
						<p className="font-medium text-sm mt-3">Optional Fields:</p>
						<ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
							<li>
								propertyType - SINGLE_FAMILY, MULTI_UNIT, APARTMENT, COMMERCIAL,
								CONDO, TOWNHOUSE, OTHER
							</li>
							<li>description - Property description</li>
						</ul>
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => {
							setOpen(false)
							setFile(null)
							setResult(null)
						}}
						disabled={loading}
					>
						Cancel
					</Button>
					<Button onClick={handleUpload} disabled={!file || loading}>
						{loading ? 'Importing...' : 'Import Properties'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
