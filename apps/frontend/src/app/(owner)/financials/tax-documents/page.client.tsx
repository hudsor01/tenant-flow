'use client'

interface TaxDocumentsClientProps {
	initialYear: number
}

export const TaxDocumentsClient = ({ initialYear }: TaxDocumentsClientProps) => {
	return (
		<div className="p-6 space-y-6">
			<div className="flex-between">
				<div>
					<h1 className="typography-h2">Tax Documents</h1>
					<p className="text-muted/600">
						Tax preparation and filing documents for {initialYear}
					</p>
				</div>
			</div>
			{/* Tax documents content will be implemented here */}
		</div>
	)
}
