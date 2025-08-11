import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { CSPNonceMeta } from "@/components/security/csp-nonce-meta";
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

export { viewport, metadata } from "./layout.constants";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* CSP Nonce Meta Tag for Client Access */}
        <CSPNonceMeta />
        
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
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white`}>
        {children}
        
        {/* Web Vitals Monitoring */}
        {/* <WebVitalsReporter /> */}
        
        {/* PostHog is initialized via the PHProvider in the dashboard layout */}
      </body>
    </html>
  );
}
