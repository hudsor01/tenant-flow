import { structuredData } from '@/lib/metadata'

export function SEOHead() {
	return (
		<>
			<meta name="viewport" content="width=device-width, initial-scale=1" />
			<meta name="theme-color" content="var(--color-system-blue)" />
			<meta name="color-scheme" content="light dark" />
			<meta name="mobile-web-app-capable" content="yes" />
			<meta name="apple-mobile-web-app-capable" content="yes" />
			<meta name="apple-mobile-web-app-status-bar-style" content="default" />
			<meta name="apple-mobile-web-app-title" content="TenantFlow" />
			<meta name="application-name" content="TenantFlow" />
			<meta name="msapplication-TileColor" content="var(--color-system-blue)" />
			<meta name="msapplication-config" content="/browserconfig.xml" />

			<link rel="preconnect" href="https://api.fonts.cofo.sasjs.io" />
			<link rel="preconnect" href="https://api.fonts.cofo.sasjs.io" crossOrigin="anonymous" />
			<link rel="dns-prefetch" href="//api.fonts.cofo.sasjs.io" />

			<script
				type="application/ld+json"
				dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
			/>
		</>
	)
}