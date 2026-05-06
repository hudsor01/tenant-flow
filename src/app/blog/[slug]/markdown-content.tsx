/**
 * Markdown renderer for blog posts. This module deliberately omits
 * `'use client'`, but its parent (`blog-post-page.tsx`) is a client
 * component, so the React Server Components rule means this file is
 * still part of the client bundle in practice — a transitive import
 * from a `'use client'` boundary is a Client Component regardless of
 * whether it declares the directive itself.
 *
 * The SEO win comes from a different mechanism: dropping the parent's
 * `dynamic(import, { ssr: false })` wrapper restored the SSR pass, so
 * Next.js now ships the rendered article body in the initial HTML.
 * Library choice still matters because it must work both at SSR and on
 * the client — `react-markdown` v9+, `remark-gfm`, `rehype-raw`, and
 * `rehype-sanitize` are pure Node libs with no DOM-only dependencies,
 * so they render identically in both passes.
 */
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'

interface MarkdownContentProps {
	content: string
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			rehypePlugins={[rehypeRaw, rehypeSanitize]}
		>
			{content}
		</ReactMarkdown>
	)
}
