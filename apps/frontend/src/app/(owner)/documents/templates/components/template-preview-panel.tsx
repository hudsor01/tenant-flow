'use client'

import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '#components/ui/card'
import { Button } from '#components/ui/button'
import { Download, Eye } from 'lucide-react'

interface TemplatePreviewPanelProps {
	title: string
	previewUrl: string | null
	isGenerating: boolean
	isExporting: boolean
	onPreview: () => void
	onExport: () => void
	children?: ReactNode
}

export function TemplatePreviewPanel({
	title,
	previewUrl,
	isGenerating,
	isExporting,
	onPreview,
	onExport,
	children
}: TemplatePreviewPanelProps) {
	return (
		<Card className="h-full">
			<CardHeader className="flex flex-col gap-3">
				<CardTitle className="flex items-center justify-between">
					<span>{title} preview</span>
					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={onPreview}
							disabled={isGenerating}
						>
							<Eye className="mr-2 size-4" />
							{isGenerating ? 'Generating...' : 'Preview PDF'}
						</Button>
						<Button
							type="button"
							size="sm"
							onClick={onExport}
							disabled={isExporting}
						>
							<Download className="mr-2 size-4" />
							{isExporting ? 'Exporting...' : 'Export PDF'}
						</Button>
					</div>
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{children}
				{previewUrl ? (
					<iframe
						src={previewUrl}
						title={`${title} PDF preview`}
						className="h-[520px] w-full rounded border"
					/>
				) : (
					<div className="flex h-[520px] items-center justify-center rounded border border-dashed text-sm text-muted-foreground">
						Generate a preview to view the PDF output.
					</div>
				)}
			</CardContent>
		</Card>
	)
}
