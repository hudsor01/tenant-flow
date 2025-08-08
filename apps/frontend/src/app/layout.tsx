import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { WebVitalsReporter } from "@/components/monitoring/web-vitals-reporter";
import { generateOrganizationSchema, generateWebsiteSchema, generateSoftwareApplicationSchema } from "@/lib/seo/generate-metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#ffffff',
}

export const metadata: Metadata = {
  title: {
    default: "TenantFlow - Property Management Platform",
    template: "%s | TenantFlow"
  },
  description: "Modern property management platform for landlords and tenants. Manage properties, track rent, handle maintenance requests, and streamline operations.",
  keywords: ["property management", "landlord", "tenant", "rent collection", "maintenance", "real estate"],
  authors: [{ name: "TenantFlow Team" }],
  creator: "TenantFlow",
  publisher: "TenantFlow",
  metadataBase: new URL('https://tenantflow.app'),
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://tenantflow.app',
    title: 'TenantFlow - Property Management Platform',
    description: 'Modern property management platform for landlords and tenants.',
    siteName: 'TenantFlow',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'TenantFlow Property Management'
      }
    ]
  },
  
  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'TenantFlow - Property Management Platform',
    description: 'Modern property management platform for landlords and tenants.',
    images: ['/og-image.jpg'],
    creator: '@tenantflow'
  },
  
  // Additional SEO
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Performance hints
  other: {
    'theme-color': '#ffffff',
    'color-scheme': 'light',
    'format-detection': 'telephone=no'
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preconnect to critical domains */}
        <link
          rel="preconnect"
          href="https://api.tenantflow.app"
          crossOrigin="anonymous"
        />
        <link
          rel="dns-prefetch"
          href="https://api.tenantflow.app"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        
        {/* Structured data for SEO */}
        <Script
          id="organization-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateOrganizationSchema()),
          }}
        />
        <Script
          id="website-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateWebsiteSchema()),
          }}
        />
        <Script
          id="software-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(generateSoftwareApplicationSchema()),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        
        {/* Web Vitals Monitoring */}
        <WebVitalsReporter />
        
        {/* Analytics Scripts */}
        {process.env.NODE_ENV === 'production' && (
          <>
            {/* Google Analytics */}
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
                  page_title: document.title,
                  page_location: window.location.href,
                });
              `}
            </Script>
            
            {/* PostHog Analytics */}
            {process.env.NEXT_PUBLIC_POSTHOG_KEY && (
              <Script
                src="/js/posthog.js"
                strategy="afterInteractive"
              />
            )}
          </>
        )}
      </body>
    </html>
  );
}
