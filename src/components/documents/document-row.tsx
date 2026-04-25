'use client'

import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger
} from '#components/ui/dialog'
import { Button } from '#components/ui/button'
import { Download, FileText, Image as ImageIcon, Trash2 } from 'lucide-react'
import type { DocumentRow as DocumentRowData } from '#hooks/api/query-keys/document-keys'
import { formatBytes } from '#lib/format-bytes'

function isImage(mime: string | null | undefined): boolean {
	return !!mime && mime.startsWith('image/')
}

// Pre-migration rows stored browser MIME in document_type; post-migration
// rows populate mime_type separately. Prefer mime_type but fall through to
// document_type so legacy rows still render correctly.
type MimeResolvable = Pick<DocumentRowData, 'mime_type' | 'document_type'>

function resolveMime(doc: MimeResolvable): string | null {
	if (doc.mime_type) return doc.mime_type
	if (doc.document_type && doc.document_type.includes('/')) return doc.document_type
	return null
}

interface DocumentRowProps {
	doc: DocumentRowData
	isOpen: boolean
	onOpenChange: (open: boolean) => void
	/** Absent on read-only surfaces (e.g. the global vault). When omitted
	 *  the Remove button is hidden — vault deletion happens on the entity
	 *  detail page so list-cache invalidation stays scoped. */
	onDelete?: (doc: DocumentRowData) => void
	isDeleting?: boolean
}

export function DocumentRow({
	doc,
	isOpen,
	onOpenChange,
	onDelete,
	isDeleting = false
}: DocumentRowProps) {
	const mime = resolveMime(doc)
	const Icon = isImage(mime) ? ImageIcon : FileText
	const displayName = doc.title ?? doc.file_path

	return (
		<li className="py-3">
			<Dialog open={isOpen} onOpenChange={onOpenChange}>
				<div className="flex items-center justify-between gap-3">
					<DialogTrigger asChild>
						<button
							type="button"
							className="flex-1 min-w-0 flex items-center gap-3 rounded-md -mx-2 px-2 py-1.5 transition-colors hover:bg-accent text-left"
							disabled={!doc.signed_url}
							aria-label={`Preview ${displayName}`}
							aria-haspopup="dialog"
						>
							<Icon
								className="size-5 shrink-0 text-muted-foreground"
								aria-hidden="true"
							/>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-foreground">
									{displayName}
								</p>
								<p className="truncate text-xs text-muted-foreground">
									{formatBytes(doc.file_size)} ·{' '}
									{new Date(doc.created_at).toLocaleDateString('en-US', {
										month: 'short',
										day: 'numeric',
										year: 'numeric'
									})}
								</p>
							</div>
						</button>
					</DialogTrigger>
					{doc.signed_url ? (
						<Button
							size="sm"
							variant="ghost"
							asChild
							className="shrink-0"
						>
							<a
								href={doc.signed_url}
								download={displayName}
								aria-label={`Download ${displayName}`}
							>
								<Download className="size-4" />
							</a>
						</Button>
					) : null}
				</div>
				<DialogContent
					className="max-w-4xl p-2"
					onInteractOutside={e => {
						if (isDeleting) e.preventDefault()
					}}
					onEscapeKeyDown={e => {
						if (isDeleting) e.preventDefault()
					}}
				>
					<DialogTitle className="sr-only">{displayName}</DialogTitle>
					{doc.signed_url ? (
						isImage(mime) ? (
							<img
								src={doc.signed_url}
								alt={displayName}
								className="w-full rounded-md"
								loading="lazy"
								decoding="async"
							/>
						) : (
							// The browser's built-in PDF viewer doesn't need
							// scripts to render — dropping `allow-scripts`
							// keeps a weaponised PDF (PDF JS APIs, embedded
							// scripts) from executing inside the iframe.
							<iframe
								src={doc.signed_url}
								title={displayName}
								className="w-full h-[70vh] rounded-md"
								sandbox="allow-same-origin"
							/>
						)
					) : (
						<p className="text-sm text-muted-foreground p-4">
							Preview unavailable.
						</p>
					)}
					<div className="flex items-center justify-between p-2">
						<span className="text-sm text-muted-foreground truncate">
							{displayName}
						</span>
						{onDelete && (
							<Button
								size="sm"
								variant="outline"
								onClick={() => onDelete(doc)}
								disabled={isDeleting}
								className="text-destructive hover:text-destructive hover:bg-destructive/10"
							>
								<Trash2 className="size-4 mr-2" />
								{isDeleting ? 'Removing...' : 'Remove'}
							</Button>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</li>
	)
}
