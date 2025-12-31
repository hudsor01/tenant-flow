'use client'

import { FileText, Download } from 'lucide-react'
import { BlurFade } from '#components/ui/blur-fade'
import { Button } from '#components/ui/button'
import { formatDate } from '#lib/formatters/date'

interface Document {
	id: string
	name: string
	uploadedAt: string
	downloadUrl?: string | undefined
}

interface DocumentsSectionProps {
	documents: Document[]
	onDownloadDocument?: ((documentId: string) => void) | undefined
}

export function DocumentsSection({
	documents,
	onDownloadDocument
}: DocumentsSectionProps) {
	return (
		<BlurFade delay={0.6} inView>
			<div className="mt-6 bg-card border border-border rounded-lg">
				<div className="p-5 border-b border-border">
					<h3 className="font-medium text-foreground">Documents</h3>
					<p className="text-sm text-muted-foreground">
						Your lease and important files
					</p>
				</div>
				<div className="divide-y divide-border">
					{documents.length === 0 ? (
						<div className="p-8 text-center">
							<div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
								<FileText
									className="w-6 h-6 text-muted-foreground"
									aria-hidden="true"
								/>
							</div>
							<p className="text-muted-foreground">No documents available</p>
						</div>
					) : (
						documents.map((doc, idx) => (
							<BlurFade key={doc.id} delay={0.65 + idx * 0.05} inView>
								<div className="p-4 flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
											<FileText
												className="w-5 h-5 text-muted-foreground"
												aria-hidden="true"
											/>
										</div>
										<div>
											<p className="font-medium text-foreground">{doc.name}</p>
											<p className="text-sm text-muted-foreground">
												Added {formatDate(doc.uploadedAt)}
											</p>
										</div>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => onDownloadDocument?.(doc.id)}
										className="gap-2 text-primary hover:bg-primary/5"
										aria-label={`Download ${doc.name}`}
									>
										<Download className="w-4 h-4" aria-hidden="true" />
										Download
									</Button>
								</div>
							</BlurFade>
						))
					)}
				</div>
			</div>
		</BlurFade>
	)
}
