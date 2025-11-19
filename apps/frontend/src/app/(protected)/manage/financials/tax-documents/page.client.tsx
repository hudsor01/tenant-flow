'use client'

interface TaxDocumentsClientProps {
	initialYear: number
}

export const TaxDocumentsClient = ({ initialYear }: TaxDocumentsClientProps) => {
	return (
		<div className="p-6 space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Tax Documents</h1>
					<p className="text-gray-600">
						Tax preparation and filing documents for {initialYear}
					</p>
				</div>
			</div>
			{/* Tax documents content will be implemented here */}
		</div>
	)
}
