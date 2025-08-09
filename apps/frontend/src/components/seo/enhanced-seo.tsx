import Script from 'next/script'
import {
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateLocalBusinessSchema,
  generateProductSchema,
} from '@/lib/seo/generate-metadata'

interface BreadcrumbItem {
  name: string
  url: string
}

interface FAQ {
  question: string
  answer: string
}

interface EnhancedSEOProps {
  breadcrumbs?: BreadcrumbItem[]
  faqs?: FAQ[]
  includeLocalBusiness?: boolean
  includeProduct?: boolean
  customSchema?: Record<string, unknown>[]
}

/**
 * Enhanced SEO Component
 * Adds structured data and additional SEO elements beyond basic metadata
 */
export function EnhancedSEO({
  breadcrumbs,
  faqs,
  includeLocalBusiness = false,
  includeProduct = false,
  customSchema = [],
}: EnhancedSEOProps) {
  const schemas = []

  // Add breadcrumb schema
  if (breadcrumbs && breadcrumbs.length > 0) {
    schemas.push(generateBreadcrumbSchema(breadcrumbs))
  }

  // Add FAQ schema
  if (faqs && faqs.length > 0) {
    schemas.push(generateFAQSchema(faqs))
  }

  // Add local business schema
  if (includeLocalBusiness) {
    schemas.push(generateLocalBusinessSchema())
  }

  // Add product schema
  if (includeProduct) {
    schemas.push(generateProductSchema())
  }

  // Add custom schemas
  schemas.push(...customSchema)

  return (
    <>
      {schemas.map((schema, index) => (
        <Script
          key={`schema-${index}`}
          id={`structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema),
          }}
        />
      ))}
    </>
  )
}

// Predefined FAQ sets for common pages
export const COMMON_FAQS = {
  homepage: [
    {
      question: "What is TenantFlow?",
      answer: "TenantFlow is a comprehensive property management platform designed for landlords, property managers, and tenants. It streamlines rent collection, maintenance tracking, lease management, and communication between all parties."
    },
    {
      question: "How much does TenantFlow cost?",
      answer: "TenantFlow offers flexible pricing starting at $29/month for small landlords managing up to 50 units, with professional plans available for larger property management companies."
    },
    {
      question: "Is TenantFlow secure?",
      answer: "Yes, TenantFlow employs bank-level security with SSL encryption, secure data storage, and compliance with industry standards to protect your sensitive property and tenant information."
    },
    {
      question: "Can tenants access TenantFlow?",
      answer: "Yes, TenantFlow includes a tenant portal where tenants can pay rent online, submit maintenance requests, communicate with landlords, and access important documents and lease information."
    }
  ],
  pricing: [
    {
      question: "Do you offer a free trial?",
      answer: "Yes, we offer a 14-day free trial with full access to all features. No credit card required to start your trial."
    },
    {
      question: "Can I change my plan anytime?",
      answer: "Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards (Visa, MasterCard, American Express) and bank transfers (ACH) for annual subscriptions."
    }
  ],
  features: [
    {
      question: "What features are included in TenantFlow?",
      answer: "TenantFlow includes property management, tenant screening, rent collection, maintenance tracking, lease management, financial reporting, communication tools, and document storage."
    },
    {
      question: "Is there a mobile app?",
      answer: "TenantFlow is fully responsive and works perfectly on mobile devices. We also offer native mobile apps for iOS and Android for on-the-go property management."
    },
    {
      question: "Does TenantFlow integrate with other software?",
      answer: "Yes, TenantFlow integrates with popular accounting software like QuickBooks, payment processors like Stripe, and various background check services."
    }
  ]
}

// Common breadcrumb patterns
export const COMMON_BREADCRUMBS = {
  dashboard: [
    { name: 'Home', url: 'https://tenantflow.app' },
    { name: 'Dashboard', url: 'https://tenantflow.app/dashboard' }
  ],
  properties: [
    { name: 'Home', url: 'https://tenantflow.app' },
    { name: 'Dashboard', url: 'https://tenantflow.app/dashboard' },
    { name: 'Properties', url: 'https://tenantflow.app/properties' }
  ],
  pricing: [
    { name: 'Home', url: 'https://tenantflow.app' },
    { name: 'Pricing', url: 'https://tenantflow.app/pricing' }
  ]
}