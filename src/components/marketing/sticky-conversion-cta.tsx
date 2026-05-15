"use client";

import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "#components/ui/button";
import { cn } from "#lib/utils";

interface StickyConversionCtaProps {
	primaryHref?: string;
	primaryLabel?: string;
	secondaryHref?: string;
	secondaryLabel?: string;
	scrollThresholdPx?: number;
	storageKey?: string;
}

// 24h dismissal — long enough that visitors aren't nagged, short enough that
// a returning bounce sees the prompt again.
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Floating bottom-pinned CTA that appears after the visitor has scrolled
 * past `scrollThresholdPx` (default 600px). Dismissible; dismissal is
 * remembered in localStorage for 24h.
 *
 * No flag — this is a low-friction conversion surface that complements
 * the page's existing inline CTAs (it doesn't replace them).
 */
export function StickyConversionCta({
	primaryHref = "/pricing",
	primaryLabel = "Start free trial",
	secondaryHref,
	secondaryLabel,
	scrollThresholdPx = 600,
	storageKey = "tenantflow-sticky-cta-dismissed-at",
}: StickyConversionCtaProps) {
	const [visible, setVisible] = useState(false);
	const [dismissed, setDismissed] = useState(false);

	useEffect(() => {
		if (dismissed) return;

		const raw = window.localStorage.getItem(storageKey);
		if (raw) {
			const ts = Number(raw);
			if (Number.isFinite(ts) && Date.now() - ts < DISMISS_TTL_MS) {
				setDismissed(true);
				return;
			}
		}

		function onScroll() {
			setVisible(window.scrollY > scrollThresholdPx);
		}
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, [scrollThresholdPx, storageKey, dismissed]);

	function handleDismiss() {
		window.localStorage.setItem(storageKey, String(Date.now()));
		setDismissed(true);
	}

	if (dismissed || !visible) return null;

	return (
		<div
			role="complementary"
			aria-label="Conversion call to action"
			className={cn(
				"fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-2xl",
				"rounded-2xl border border-border bg-background/95 backdrop-blur-md",
				"shadow-2xl shadow-primary/10",
				"p-4 sm:p-5",
				"flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4",
				"animate-in slide-in-from-bottom-4 fade-in duration-normal",
			)}
		>
			<div className="flex-1 min-w-0">
				<p className="text-sm font-semibold text-foreground">
					Ready to simplify your rental admin?
				</p>
				<p className="text-xs text-muted-foreground">
					14-day free trial. No credit card required.
				</p>
			</div>
			<div className="flex items-center gap-2">
				{secondaryHref && secondaryLabel && (
					<Button asChild variant="ghost" size="sm">
						<Link href={secondaryHref}>{secondaryLabel}</Link>
					</Button>
				)}
				<Button asChild size="sm">
					<Link href={primaryHref}>
						{primaryLabel}
						<ArrowRight className="size-4 ml-1" />
					</Link>
				</Button>
				<button
					type="button"
					onClick={handleDismiss}
					aria-label="Dismiss"
					className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					<X className="size-4" />
				</button>
			</div>
		</div>
	);
}
