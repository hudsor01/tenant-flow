// Probe stub for next/link (component-probes.mjs maps the specifier here, 66.2-35). The real module
// reads process.env at load, which only Next's bundler defines, so outside Next it throws before any
// probe registers. The quick-actions-dock-centering probe measures layout only, so a plain anchor
// carrying the same attributes is enough.
import type { ReactNode } from "react";

interface ProbeLinkProps {
	href: string;
	className?: string;
	"aria-label"?: string;
	title?: string;
	children?: ReactNode;
}

export default function Link({ href, className, "aria-label": ariaLabel, title, children }: ProbeLinkProps) {
	return (
		<a href={href} className={className} aria-label={ariaLabel} title={title}>
			{children}
		</a>
	);
}
