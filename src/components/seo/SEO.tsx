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
  canonical
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

    // Cleanup function to reset title when component unmounts
    return () => {
      document.title = DEFAULT_SEO.title;
    };
  }, [siteTitle, description, keywords, fullImageUrl, fullUrl, type, noIndex, canonical]);

  return null; // This component doesn't render anything visually
}
