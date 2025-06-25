import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  noIndex?: boolean;
  canonical?: string;
  structuredData?: Record<string, unknown>;
  breadcrumbs?: Array<{ name: string; url: string }>;
}

const DEFAULT_SEO = {
  title: 'TenantFlow - Modern Property Management Software',
  description: 'Streamline your property management with TenantFlow. Manage tenants, properties, maintenance requests, and finances all in one powerful platform.',
  keywords: 'property management, tenant management, rental properties, maintenance tracking, property software, real estate management',
  image: '/og-image.png',
  type: 'website' as const,
};

export function SEO({
  title,
  description = DEFAULT_SEO.description,
  keywords = DEFAULT_SEO.keywords,
  image = DEFAULT_SEO.image,
  url,
  type = DEFAULT_SEO.type,
  noIndex = false,
  canonical,
  structuredData,
  breadcrumbs
}: SEOProps) {
  const siteTitle = title 
    ? `${title} | TenantFlow`
    : DEFAULT_SEO.title;

  const fullImageUrl = image?.startsWith('http') 
    ? image 
    : `${window.location.origin}${image}`;

  const fullUrl = url || window.location.href;

  useEffect(() => {
    // Update document title
    document.title = siteTitle;

    // Helper function to update or create meta tags
    const updateMetaTag = (property: string, content: string, useProperty = false) => {
      const selector = useProperty ? `meta[property="${property}"]` : `meta[name="${property}"]`;
      let tag = document.querySelector(selector) as HTMLMetaElement;
      
      if (!tag) {
        tag = document.createElement('meta');
        if (useProperty) {
          tag.setAttribute('property', property);
        } else {
          tag.setAttribute('name', property);
        }
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };

    // Update basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    updateMetaTag('robots', noIndex ? 'noindex, nofollow' : 'index, follow');
    updateMetaTag('author', 'TenantFlow');
    
    // Search engine verification meta tags (replace with actual verification codes)
    updateMetaTag('google-site-verification', 'YOUR_GOOGLE_VERIFICATION_CODE_HERE');
    updateMetaTag('msvalidate.01', 'YOUR_BING_VERIFICATION_CODE_HERE');
    updateMetaTag('yandex-verification', 'YOUR_YANDEX_VERIFICATION_CODE_HERE');

    // Update Open Graph tags
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:title', siteTitle, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', fullImageUrl, true);
    updateMetaTag('og:url', fullUrl, true);
    updateMetaTag('og:site_name', 'TenantFlow', true);

    // Update Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', siteTitle);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', fullImageUrl);

    // Update canonical link
    if (canonical) {
      let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', canonical);
    }

    // Add structured data (JSON-LD)
    const addStructuredData = (data: Record<string, unknown>) => {
      // Remove existing structured data script
      const existingScript = document.querySelector('script[type="application/ld+json"][data-seo]');
      if (existingScript) {
        existingScript.remove();
      }

      // Create new structured data script
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-seo', 'true');
      script.textContent = JSON.stringify(data);
      document.head.appendChild(script);
    };

    // Default structured data for the website
    const defaultStructuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "TenantFlow",
      "applicationCategory": "BusinessApplication",
      "description": "Modern property management software for landlords and property managers",
      "url": "https://tenantflow.app",
      "operatingSystem": "Web Browser",
      "offers": {
        "@type": "Offer",
        "price": "49",
        "priceCurrency": "USD",
        "priceValidUntil": "2025-12-31"
      },
      "publisher": {
        "@type": "Organization",
        "name": "TenantFlow",
        "url": "https://tenantflow.app"
      }
    };

    // Use custom structured data or default
    const finalStructuredData = structuredData || defaultStructuredData;
    addStructuredData(finalStructuredData);

    // Add breadcrumb structured data if provided
    if (breadcrumbs && breadcrumbs.length > 0) {
      const breadcrumbStructuredData = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((crumb, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "name": crumb.name,
          "item": crumb.url
        }))
      };

      // Add breadcrumb script separately
      const breadcrumbScript = document.createElement('script');
      breadcrumbScript.type = 'application/ld+json';
      breadcrumbScript.setAttribute('data-breadcrumb', 'true');
      breadcrumbScript.textContent = JSON.stringify(breadcrumbStructuredData);
      document.head.appendChild(breadcrumbScript);
    }

    // Cleanup function to reset title and remove structured data when component unmounts
    return () => {
      document.title = DEFAULT_SEO.title;
      const structuredDataScript = document.querySelector('script[type="application/ld+json"][data-seo]');
      if (structuredDataScript) {
        structuredDataScript.remove();
      }
      const breadcrumbScript = document.querySelector('script[type="application/ld+json"][data-breadcrumb]');
      if (breadcrumbScript) {
        breadcrumbScript.remove();
      }
    };
  }, [siteTitle, description, keywords, fullImageUrl, fullUrl, type, noIndex, canonical, structuredData, breadcrumbs]);

  return null; // This component doesn't render anything visually
}
