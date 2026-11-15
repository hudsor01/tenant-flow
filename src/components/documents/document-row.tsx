"use client";

import { Download, FileText, Image as ImageIcon, Trash2 } from "lucide-react";
import { Button } from "#components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "#components/ui/dialog";
import type { DocumentRow as DocumentRowData } from "#hooks/api/query-keys/document-keys";
import { formatBytes } from "#lib/format-bytes";

function isImage(mime: string | null | undefined): boolean {
	return !!mime && mime.startsWith("image/");
}

// Post-Phase-61 invariant: `document_type` is a categorical enum (lease,
// receipt, …, other) — never a MIME string. The MIME lives exclusively in
// `mime_type`. The pre-migration MIME-in-document_type fallback was
// removed when migration 20260425172604 added the CHECK constraint and
// coerced any out-of-band rows to 'other'.
type MimeResolvable = Pick<DocumentRowData, "mime_type">;

function resolveMime(doc: MimeResolvable): string | null {
	return doc.mime_type ?? null;
}

interface DocumentRowProps {
	doc: DocumentRowData;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	/** Absent on read-only surfaces (e.g. the global vault) and for a row the
	 *  section keeps but won't let the owner remove (the e-signed lease). When
	 *  omitted the Remove button is hidden — vault deletion happens on the
	 *  entity detail page so list-cache invalidation stays scoped. */
	onDelete?: (doc: DocumentRowData) => void;
	/** Shown in the preview footer in place of Remove, saying why this row
	 *  cannot be removed. */
	lockedNote?: string;
	isDeleting?: boolean;
}

export function DocumentRow({
	doc,
	isOpen,
	onOpenChange,
	onDelete,
	lockedNote,
	isDeleting = false,
}: DocumentRowProps) {
	const mime = resolveMime(doc);
	const Icon = isImage(mime) ? ImageIcon : FileText;
	const displayName = doc.title ?? doc.file_path;

	return (
		<li className="py-3">
			<Dialog open={isOpen} onOpenChange={onOpenChange}>
				<div className="flex items-center justify-between gap-3">
					<DialogTrigger asChild>
						<button
							type="button"
							className="flex-1 min-w-0 flex items-center gap-3 rounded-md -mx-2 px-2 py-1.5 transition-colors hover:bg-muted text-left"
							disabled={!doc.signed_url}
							aria-haspopup="dialog"
						>
							<Icon
								className="size-5 shrink-0 text-muted-foreground"
								aria-hidden="true"
							/>
							<div className="min-w-0 flex-1">
								<p className="mb-0 truncate text-sm font-medium text-foreground">
									{displayName}
								</p>
								<p className="mb-0 truncate text-xs text-muted-foreground">
									{formatBytes(doc.file_size)} ·{" "}
									{doc.created_at
										? new Date(doc.created_at).toLocaleDateString("en-US", {
												month: "short",
												day: "numeric",
												year: "numeric",
											})
										: "—"}
								</p>
							</div>
						</button>
					</DialogTrigger>
					{doc.signed_url ? (
						<Button size="sm" variant="ghost" asChild className="shrink-0">
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
					onInteractOutside={(e) => {
						if (isDeleting) e.preventDefault();
					}}
					onEscapeKeyDown={(e) => {
						if (isDeleting) e.preventDefault();
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
						<p className="mb-0 text-sm text-muted-foreground p-4">
							Preview unavailable.
						</p>
					)}
					<div className="p-2">
						<div className="flex items-center justify-between gap-3">
							<span className="min-w-0 truncate text-sm text-muted-foreground">
								{displayName}
							</span>
							{onDelete && (
								<Button
									size="sm"
									variant="outline"
									onClick={() => onDelete(doc)}
									disabled={isDeleting}
									className="text-destructive-text hover:text-destructive-text hover:bg-destructive/10 dark:hover:bg-destructive/20 dark:hover:text-destructive-text"
								>
									<Trash2 className="size-4 mr-2" />
									{isDeleting ? "Removing..." : "Remove"}
								</Button>
							)}
						</div>
						{lockedNote && !onDelete && (
							<p className="mb-0 mt-1 text-sm text-muted-foreground">
								{lockedNote}
							</p>
						)}
					</div>
				</DialogContent>
			</Dialog>
		</li>
	);
}
