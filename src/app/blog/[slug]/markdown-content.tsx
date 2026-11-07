/**
 * Markdown renderer for blog posts.
 *
 * This is a true Server Component — no `"use client"` directive. On the
 * `/blog/[slug]` render path no client module imports it, so the
 * react-markdown / remark-gfm / rehype-raw / rehype-sanitize dependency chain
 * stays out of the blog-post client bundle; the rendered ReactNode serializes
 * across the client boundary as the `articleBody` prop from `page.tsx`. (The
 * admin `blog-review-client.tsx` does import it into a client bundle and
 * intentionally accepts that cost — the SEO-02 saving is for the public post.)
 */
import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import { headingId } from "./heading-id";

interface MarkdownContentProps {
	content: string;
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
				// A wide table scrolls inside its own keyboard-focusable region, so
				// the article never scrolls sideways at 320px (WCAG 1.4.10 exempts
				// the table's two-dimensional content, not the page).
				// tabIndex: a scroll container must take focus to scroll by keyboard
				// (WCAG 2.1.1); it is not a landmark, so a post with several tables
				// adds no duplicate regions.
				table: ({ children }) => (
					<div tabIndex={0} className="overflow-x-auto">
						<table>{children}</table>
					</div>
				),
			}}
		>
			{content}
		</ReactMarkdown>
	);
}
