'use client'

import * as React from 'react'
import DOMPurify from 'dompurify'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '#components/ui/card'
import { FileText } from 'lucide-react'

interface PreviewPanelProps {
	html: string
}

export function PreviewPanel({ html }: PreviewPanelProps) {
	// Sanitize HTML to prevent XSS attacks
	const sanitizedHtml = React.useMemo(() => {
		if (typeof window === 'undefined') return html
		return DOMPurify.sanitize(html, {
			ALLOWED_TAGS: [
				'p',
				'div',
				'span',
				'br',
				'strong',
				'em',
				'u',
				'h1',
				'h2',
				'h3',
				'h4',
				'h5',
				'h6',
				'ul',
				'ol',
				'li',
				'table',
				'thead',
				'tbody',
				'tr',
				'th',
				'td'
			],
			ALLOWED_ATTR: ['class', 'style'],
			ADD_ATTR: [],
			ALLOW_DATA_ATTR: false,
			FORBID_TAGS: ['script', 'iframe', 'embed', 'object', 'form'],
			FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
		})
	}, [html])

	return (
		<Card className="shadow-sm">
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<FileText className="size-4 text-primary" /> HTML Preview
				</CardTitle>
				<CardDescription>
					Rendered lease agreement using the selected clauses.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div
					className="prose max-w-none rounded-lg border bg-white p-6 text-sm shadow-inner"
					dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
				/>
			</CardContent>
		</Card>
	)
}
