import { Metadata } from 'next';
import { Locale } from '@/lib/i18n/config';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  noindex?: boolean;
  locale?: Locale;
  alternateLocales?: Locale[];
  canonical?: string;
  type?: 'website' | 'article' | 'profile';
}

export function generateMetadata({
  title,
  description,
  keywords = [],
  image,
  noindex = false,
  locale = 'en',
  alternateLocales = ['en', 'es', 'fr', 'de'],
  canonical,
  type = 'website',
}: SEOProps): Metadata {
  const baseUrl = 'https://tenantflow.app';
  const defaultTitle = 'TenantFlow - Property Management Platform';
  const defaultDescription = 'Modern property management platform for landlords and tenants. Manage properties, track rent, handle maintenance requests, and streamline operations.';
  const defaultKeywords = ['property management', 'landlord', 'tenant', 'rent collection', 'maintenance', 'real estate'];

  const fullTitle = title ? `${title} | TenantFlow` : defaultTitle;
  const finalDescription = description || defaultDescription;
  const finalKeywords = [...defaultKeywords, ...keywords];
  const ogImage = image || '/og-image.jpg';

  const metadata: Metadata = {
    title: fullTitle,
    description: finalDescription,
    keywords: finalKeywords,
    authors: [{ name: 'TenantFlow Team' }],
    creator: 'TenantFlow',
    publisher: 'TenantFlow',
    
    // Canonical URL
    ...(canonical && {
      alternates: {
        canonical: `${baseUrl}${canonical}`,
      },
    }),

    // Robots
    robots: {
      index: !noindex,
      follow: !noindex,
      googleBot: {
        index: !noindex,
        follow: !noindex,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },

    // Open Graph
    openGraph: {
      type,
      locale,
      url: canonical ? `${baseUrl}${canonical}` : baseUrl,
      title: fullTitle,
      description: finalDescription,
      siteName: 'TenantFlow',
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title || 'TenantFlow Property Management',
        },
      ],
    },

    // Twitter
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description: finalDescription,
      images: [ogImage],
      creator: '@tenantflow',
      site: '@tenantflow',
    },

    // Additional SEO
    other: {
      'theme-color': '#ffffff',
      'color-scheme': 'light',
      'format-detection': 'telephone=no',
      'apple-mobile-web-app-title': 'TenantFlow',
      'application-name': 'TenantFlow',
      'msapplication-TileColor': '#ffffff',
    },
  };

  // Add alternate languages if provided
  if (alternateLocales.length > 1) {
    metadata.alternates = {
      ...metadata.alternates,
      languages: Object.fromEntries(
        alternateLocales.map((lang) => [
          lang,
          canonical ? `${baseUrl}/${lang}${canonical}` : `${baseUrl}/${lang}`,
        ])
      ),
    };
  }

  return metadata;
}

// JSON-LD structured data generators
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'TenantFlow',
    url: 'https://tenantflow.app',
    logo: 'https://tenantflow.app/logo.png',
    description: 'Modern property management platform for landlords and tenants',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-555-123-4567',
      contactType: 'Customer Service',
      availableLanguage: ['English', 'Spanish'],
    },
    sameAs: [
      'https://twitter.com/tenantflow',
      'https://linkedin.com/company/tenantflow',
    ],
  };
}

export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'TenantFlow',
    url: 'https://tenantflow.app',
    description: 'Property management platform for landlords and tenants',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://tenantflow.app/search?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };
}

export function generateSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'TenantFlow',
    operatingSystem: 'Web Browser',
    applicationCategory: 'BusinessApplication',
    description: 'Property management platform for landlords and tenants',
    url: 'https://tenantflow.app',
    screenshot: 'https://tenantflow.app/screenshot.png',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
    },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: '29',
      priceValidUntil: '2025-12-31',
    },
  };
}