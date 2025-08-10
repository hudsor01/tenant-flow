import type { Metadata } from '@/types/next';
import type { Locale } from '@/lib/i18n/config';

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

    // Note: No Twitter metadata as TenantFlow only uses Facebook and LinkedIn

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
      'https://www.facebook.com/tenantflow',
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
    description: 'Comprehensive property management platform for landlords, property managers, and tenants. Features include rent collection, maintenance tracking, lease management, and financial reporting.',
    url: 'https://tenantflow.app',
    screenshot: 'https://tenantflow.app/images/dashboard-screenshot.png',
    featureList: [
      'Property Management',
      'Tenant Management', 
      'Rent Collection',
      'Maintenance Tracking',
      'Lease Management',
      'Financial Reporting',
      'Communication Tools',
      'Document Management'
    ],
    applicationSubCategory: 'Property Management Software',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
      bestRating: '5',
      worstRating: '1'
    },
    offers: [
      {
        '@type': 'Offer',
        name: 'Basic Plan',
        priceCurrency: 'USD',
        price: '29',
        pricePer: 'month',
        priceValidUntil: '2025-12-31',
        description: 'Perfect for small landlords managing up to 50 units'
      },
      {
        '@type': 'Offer', 
        name: 'Professional Plan',
        priceCurrency: 'USD',
        price: '79',
        pricePer: 'month',
        priceValidUntil: '2025-12-31',
        description: 'Ideal for property management companies with advanced features'
      }
    ],
    creator: {
      '@type': 'Organization',
      name: 'TenantFlow Inc.',
      url: 'https://tenantflow.app'
    },
    datePublished: '2024-01-01',
    dateModified: '2025-01-01'
  };
}

// Additional schema generators for enhanced SEO
export function generateBreadcrumbSchema(items: Array<{name: string, url: string}>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

export function generateFAQSchema(faqs: Array<{question: string, answer: string}>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

export function generateLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    name: 'TenantFlow Property Management Services',
    description: 'Professional property management software and services for landlords and property managers',
    url: 'https://tenantflow.app',
    telephone: '+1-555-TENANT (555-836-2681)',
    email: 'support@tenantflow.app',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'San Francisco',
      addressRegion: 'CA',
      addressCountry: 'US'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: '37.7749',
      longitude: '-122.4194'
    },
    openingHours: [
      'Mo-Fr 09:00-17:00',
      'Sa 10:00-16:00'
    ],
    priceRange: '$29-$199',
    serviceType: 'Property Management Software',
    areaServed: {
      '@type': 'Country',
      name: 'United States'
    }
  };
}

export function generateProductSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'TenantFlow Property Management Platform',
    description: 'All-in-one property management solution with rent collection, maintenance tracking, and tenant communication',
    brand: {
      '@type': 'Brand',
      name: 'TenantFlow'
    },
    category: 'Software > Business Software > Property Management',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1250',
      bestRating: '5',
      worstRating: '1'
    },
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '29',
      highPrice: '199', 
      priceCurrency: 'USD',
      offerCount: '3',
      availability: 'https://schema.org/InStock',
      seller: {
        '@type': 'Organization',
        name: 'TenantFlow Inc.'
      }
    },
    features: [
      'Multi-tenant property management',
      'Automated rent collection',
      'Maintenance request tracking',
      'Financial reporting and analytics',
      'Tenant screening and background checks',
      'Lease agreement management',
      'Real-time notifications',
      'Mobile-responsive dashboard'
    ]
  };
}