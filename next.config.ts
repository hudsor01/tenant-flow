// Build trigger: Added NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to Vercel (2025-01-16)
import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

/**
 * Build-time environment validation
 * Importing env.ts here ensures validation runs during `next build`
 * This catches missing/invalid env vars BEFORE deployment, not at runtime
 *
 * @see https://env.t3.gg/docs/nextjs#validate-schema-on-build
 */
import "./src/env";

const nextConfig: NextConfig = {
	output: "standalone",
	reactCompiler: true,

	experimental: {
		optimizePackageImports: [
			"@tanstack/react-query",
			"@tanstack/react-form",
			"@tanstack/react-virtual",
		],
	},

	// External images
	images: {
		// Cache optimized images for 7 days before re-fetching from origin
		minimumCacheTTL: 60 * 60 * 24 * 7,
		remotePatterns: [
			{ protocol: "https", hostname: "*.supabase.co" },
			{ protocol: "https", hostname: "images.unsplash.com" },
			{ protocol: "https", hostname: "api.dicebear.com" },
			{ protocol: "https", hostname: "*.googleusercontent.com" },
			// Local Supabase development (excluded from production builds)
			...(process.env.NODE_ENV !== "production"
				? [
						{ protocol: "http" as const, hostname: "127.0.0.1" },
						{ protocol: "http" as const, hostname: "localhost" },
					]
				: []),
		],
	},

	async redirects() {
		return [
			{
				// Password-manager well-known endpoint (W3C draft, consumed
				// by 1Password, Bitwarden, iCloud Keychain, Chrome, Firefox,
				// Edge). Password managers issue a GET when a user clicks
				// "change password" on a saved credential and follow the
				// redirect to the page where the form lives.
				//
				// `/auth/update-password` handles both inbound flows:
				//   - Email-recovery link (URL hash carries an error param;
				//     page renders "Reset Link Issue" copy if the token
				//     expired).
				//   - Password-manager click (no hash; page renders the
				//     "Secure Your Account" change-password form).
				// Both terminate in `auth.updateUser({ password })`, which
				// works whether the caller is currently authenticated or
				// holds a one-time recovery session.
				//
				// `permanent: false` produces a 307 so the method is
				// preserved (always GET in practice). Some older managers
				// expect 302/303 specifically; in practice all major
				// browsers and password managers follow 307 for GET.
				source: "/.well-known/change-password",
				destination: "/auth/update-password",
				permanent: false,
			},
			// CRIT-05: /signup redirect loop. /pricing is the canonical entry
			// point (Stripe checkout funnels through Supabase signup). No
			// /signup page exists; the redirect IS the fix. Implements
			// requirement CRIT-05 (eliminate loop).
			{
				source: "/signup",
				destination: "/pricing",
				permanent: true,
			},
			// CRIT-06: long-form legal URL aliases. External links/emails/
			// sitemaps may reference verbose forms; canonical paths use the
			// short forms throughout footer + llms.txt + sitemap.xml.
			// permanent: true emits 308 — Google + browsers treat as 301 for
			// SEO + cache.
			{
				source: "/terms-of-service",
				destination: "/terms",
				permanent: true,
			},
			{
				source: "/privacy-policy",
				destination: "/privacy",
				permanent: true,
			},
			{
				source: "/help-center",
				destination: "/help",
				permanent: true,
			},
			{
				source: "/rss-feed",
				destination: "/feed.xml",
				permanent: true,
			},
		];
	},
};

// Enable source maps in production, but not preview deployments
// Works on Vercel (VERCEL_ENV) and other platforms (NODE_ENV + explicit flag)
const isProduction =
	process.env.VERCEL_ENV === "production" ||
	(process.env.NODE_ENV === "production" &&
		process.env.VERCEL_ENV === undefined);

export default withSentryConfig(nextConfig, {
	org: process.env.SENTRY_ORG ?? "",
	project: process.env.SENTRY_PROJECT ?? "",
	silent: true,
	sourcemaps: {
		// Only upload on production deploys, skip previews
		disable: !isProduction,
		deleteSourcemapsAfterUpload: true,
		// Include all app chunks: app routes, shared chunks (main, framework, webpack)
		assets: [".next/static/chunks/app/**", ".next/static/chunks/*.js"],
	},
	tunnelRoute: "/monitoring",
	bundleSizeOptimizations: {
		excludeDebugStatements: true,
	},
	// Release tracking
	release: {
		setCommits: {
			auto: true,
			ignoreMissing: true,
		},
	},
});
