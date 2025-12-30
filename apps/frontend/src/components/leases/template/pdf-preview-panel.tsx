'use client'

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { Button } from '#components/ui/button'
import { Download, RefreshCw } from 'lucide-react'

interface PdfPreviewPanelProps {
	isGenerating: boolean
	dataUrl: string | null
	onGenerate: () => void
}

export function PdfPreviewPanel({
	isGenerating,
	dataUrl,
	onGenerate
}: PdfPreviewPanelProps) {
	return (
		<Card className="shadow-sm">
			<CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<CardTitle className="flex items-center gap-2 text-base">
						<Download className="size-4 text-primary" /> PDF Preview
					</CardTitle>
					<CardDescription>
						Generate a printable PDF using the current selections.
					</CardDescription>
				</div>
				<Button
					onClick={onGenerate}
					disabled={isGenerating}
					variant="default"
					size="sm"
				>
					{isGenerating ? (
						<span className="flex items-center gap-2">
							<RefreshCw className="size-4 animate-spin" /> Generating…
						</span>
					) : (
						<>
							<Download className="mr-1 size-4" /> Render PDF
						</>
					)}
				</Button>
			</CardHeader>
			<CardContent>
				{dataUrl ? (
					<div className="h-[480px] w-full overflow-hidden rounded-lg border">
						<iframe
							src={dataUrl}
							title="Lease PDF Preview"
							className="h-full w-full"
						/>
					</div>
				) : (
					<p className="text-muted">
						Generate a preview to view the PDF in-line. You can download it
						directly from the preview frame.
					</p>
				)}
			</CardContent>
		</Card>
	)
}
