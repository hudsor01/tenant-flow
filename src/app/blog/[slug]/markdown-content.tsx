/**
 * Markdown renderer for blog posts.
 *
 * This is a true Server Component — no `"use client"` directive, and no
 * client module imports it. The react-markdown / remark-gfm / rehype-raw /
 * rehype-sanitize dependency chain stays server-only, while the rendered
 * ReactNode serializes across the client boundary as part of the `articleBody`
 * prop passed from `page.tsx`.
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
			}}
		>
			{content}
		</ReactMarkdown>
	);
}
