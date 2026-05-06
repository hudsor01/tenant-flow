/**
 * Server Component renderer for blog markdown.
 *
 * Previously this file was a client component (`'use client'`) and the
 * blog post page wrapped it in `dynamic(import, { ssr: false })`. That
 * meant the article body never landed in the initial HTML — only a
 * loading skeleton — so AI crawlers (which don't run JS) and Googlebot
 * pre-render saw an empty article. With the body now flowing through
 * the server-rendered tree, the SEO regression is closed.
 *
 * `react-markdown` v9+ has no DOM-only dependencies and renders fine
 * in RSC. `remark-gfm`, `rehype-raw`, `rehype-sanitize` are all pure
 * Node libs.
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
