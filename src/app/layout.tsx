import * as Sentry from "@sentry/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GeistMono } from "geist/font/mono";
import type { Metadata, Viewport } from "next";
import { Playfair_Display, Roboto } from "next/font/google";
import type { ReactNode } from "react";

import { ErrorBoundary } from "#components/error-boundary/error-boundary";
import { Providers } from "#components/providers";
import SeoJsonLd from "#components/seo/seo-json-ld";
import RegisterServiceWorker from "#components/sw/register-sw";
import { Toaster } from "#components/ui/toast";
import { generateSiteMetadata } from "#lib/generate-metadata";

import "./globals.css";

// Roboto - clean, geometric sans-serif for body text and UI
const roboto = Roboto({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-sans",
	weight: ["300", "400", "500", "700"],
});

// Playfair Display - elegant serif for hero/marketing headlines
const playfairDisplay = Playfair_Display({
	subsets: ["latin"],
	display: "swap",
	variable: "--font-display",
});

// `themeColor` and `msapplication-TileColor` are HTML meta attribute
// values, not CSS — Tailwind tokens / CSS custom properties don't apply.
// The previous `var(--color-info)` rendered as a literal string and was
// silently ignored by browsers. Hex matches `--color-primary` (#2563eb).
export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	colorScheme: "light dark",
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#2563eb" },
		{ media: "(prefers-color-scheme: dark)", color: "#1e3a8a" },
	],
};

export async function generateMetadata(): Promise<Metadata> {
	const metadata = await generateSiteMetadata();
	return {
		...metadata,
		other: {
			...metadata.other,
			// Inject Sentry trace headers as meta tags for distributed tracing
			// Allows the browser SDK to continue the SSR trace on the client
			...(Object.fromEntries(
				Object.entries(Sentry.getTraceData()).filter(
					([, v]) => v !== undefined,
				),
			) as Record<string, string>),
		},
	};
}

export default async function RootLayout({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				{/* viewport + theme-color + color-scheme are emitted by the
				    Viewport API export above (not raw <meta> tags) so they
				    can be route-overridden via Next.js metadata API. */}
				<meta name="mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-capable" content="yes" />
				<meta name="apple-mobile-web-app-status-bar-style" content="default" />
				<meta name="apple-mobile-web-app-title" content="TenantFlow" />
				<meta name="application-name" content="TenantFlow" />
				<meta name="msapplication-TileColor" content="#2563eb" />
				{/* Blog discovery: every RSS-aware reader (Feedly, NetNewsWire,
				    Slack/Discord bots, AI crawlers fetching fresh content) checks
				    for this <link>. Cheap to ship and there's a real ecosystem
				    on the receiving side. */}
				<link
					rel="alternate"
					type="application/rss+xml"
					title="TenantFlow Blog"
					href="/feed.xml"
				/>
				<SeoJsonLd />
			</head>
			<body
				className={`${roboto.variable} ${playfairDisplay.variable} ${GeistMono.variable} font-sans antialiased`}
			>
				{/* Skip-to-content for keyboard and screen-reader users. The
				    target id="main-content" is set on <main> in PageLayout, the
				    dashboard app-shell, the login + auth layouts, and the
				    /sign/[token] page. CLAUDE.md mandates this link. */}
				<a
					href="#main-content"
					className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-md focus:ring-2 focus:ring-primary"
				>
					Skip to main content
				</a>
				<Providers>
					<div className="min-h-screen bg-background text-foreground flex flex-col">
						<ErrorBoundary>{children} </ErrorBoundary>
						{/* Register service worker silently for performance/offline */}
						<RegisterServiceWorker />
						<Toaster position="top-right" richColors closeButton />
					</div>
				</Providers>
				{process.env.NODE_ENV === "production" && (
					<>
						<Analytics />
						<SpeedInsights />
					</>
				)}
			</body>
		</html>
	);
}
