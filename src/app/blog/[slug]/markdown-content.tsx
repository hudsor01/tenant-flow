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
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

interface MarkdownContentProps {
	content: string;
}

/**
 * Shared heading-anchor slugifier — the SAME transform builds the rendered
 * `<h2 id>` (below) and the "On this page" ToC links (blog-post-page.tsx),
 * so anchors can never drift from the nav that targets them.
 */
export function headingId(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.trim()
		.replace(/\s+/g, "-");
}

function nodeText(node: ReactNode): string {
	if (typeof node === "string" || typeof node === "number") return String(node);
	if (Array.isArray(node)) return node.map(nodeText).join("");
	if (node && typeof node === "object" && "props" in node) {
		return nodeText(
			(node as { props: { children?: ReactNode } }).props.children,
		);
	}
	return "";
}

export default function MarkdownContent({ content }: MarkdownContentProps) {
	return (
		<ReactMarkdown
			remarkPlugins={[remarkGfm]}
			rehypePlugins={[rehypeRaw, rehypeSanitize]}
			components={{
				// Anchored section headings: id for ToC deep-links, scroll-mt so the
				// fixed navbar never covers the target section.
				h2: ({ children }) => (
					<h2 id={headingId(nodeText(children))} className="scroll-mt-28">
						{children}
					</h2>
				),
			}}
		>
			{content}
		</ReactMarkdown>
	);
}
