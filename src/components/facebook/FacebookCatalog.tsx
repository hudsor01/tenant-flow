import { useEffect } from 'react';
import { PLANS } from '@/types/subscription';

/**
 * Facebook Product Catalog component
 * Generates JSON-LD structured data for Facebook to understand our pricing plans
 * This enables Dynamic Ads and better product targeting
 */
export function FacebookCatalog() {
  useEffect(() => {
    // Generate Facebook product catalog data
    const catalogData = {
      "@context": "https://schema.org",
      "@type": "Product",
      "offers": PLANS.filter(plan => plan.active && plan.id !== 'free').map(plan => ({
        "@type": "Offer",
        "name": `TenantFlow ${plan.name} Plan`,
        "description": plan.description,
        "sku": plan.id,
        "price": plan.monthlyPrice,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock",
        "category": "Software",
        "brand": {
          "@type": "Brand",
          "name": "TenantFlow"
        },
        "seller": {
          "@type": "Organization",
          "name": "TenantFlow",
          "url": "https://tenantflow.app"
        },
        "url": `https://tenantflow.app/pricing?plan=${plan.id}`,
        "image": `https://tenantflow.app/images/plans/${plan.id}.png`, // You'll need to create these images
        "additionalProperty": [
          {
            "@type": "PropertyValue",
            "name": "billingPeriod",
            "value": "monthly"
          },
          {
            "@type": "PropertyValue", 
            "name": "properties",
            "value": plan.limits.properties.toString()
          },
          {
            "@type": "PropertyValue",
            "name": "tenants", 
            "value": plan.limits.tenants.toString()
          },
          {
            "@type": "PropertyValue",
            "name": "storage",
            "value": plan.limits.storage.toString()
          }
        ]
      }))
    };

    // Remove existing catalog schema
    const existingScript = document.querySelector('script[type="application/ld+json"][data-facebook-catalog]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new catalog schema
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.setAttribute('data-facebook-catalog', 'true');
    script.textContent = JSON.stringify(catalogData);
    document.head.appendChild(script);

    // Cleanup on unmount
    return () => {
      const scriptToRemove = document.querySelector('script[type="application/ld+json"][data-facebook-catalog]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, []);

  return null; // This component doesn't render anything visually
}


