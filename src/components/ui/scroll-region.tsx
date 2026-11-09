"use client";

/**
 * A box that scrolls, which a keyboard can reach while it does (66.2-39 fix
 * round 4, Part 8h; WCAG 2.1.1).
 *
 * A table wider than its box scrolls sideways, and with no control inside,
 * nothing in it takes focus, so a keyboard user cannot scroll it: axe's
 * scrollable-region-focusable failed the lease ledger and the property
 * performance tables, the bulk import preview, and the /features,
 * /compare and security deposit card tables. The box takes `tabIndex={0}`
 * while its content overflows (measured on mount, on resize and when its
 * children change), and no tab stop while it fits. The focus ring is the
 * global `*:focus-visible` outline.
 */
import { type ComponentProps, useEffect, useRef, useState } from "react";

function ScrollRegion(props: Omit<ComponentProps<"div">, "ref">) {
	const box = useRef<HTMLDivElement>(null);
	const [scrolls, setScrolls] = useState(false);

	useEffect(() => {
		const element = box.current;
		if (!element) return;
		const measure = () =>
			setScrolls(
				element.scrollWidth > element.clientWidth + 1 ||
					element.scrollHeight > element.clientHeight + 1,
			);
		measure();
		const resize = new ResizeObserver(measure);
		const observeAll = () => {
			resize.disconnect();
			resize.observe(element);
			for (const child of element.children) resize.observe(child);
		};
		observeAll();
		const mutations = new MutationObserver(() => {
			observeAll();
			measure();
		});
		mutations.observe(element, { childList: true });
		return () => {
			resize.disconnect();
			mutations.disconnect();
		};
	}, []);

	return <div ref={box} tabIndex={scrolls ? 0 : undefined} {...props} />;
}

export { ScrollRegion };
