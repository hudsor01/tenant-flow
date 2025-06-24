import { useMemo } from 'react';
import type { BlogArticle } from './useBlogArticleData';
import { generateBlogSEO } from '@/lib/seo-utils';

interface UseBlogSEOProps {
  article: BlogArticle;
  slug: string;
}


/**
 * Custom hook for managing blog article SEO data
 * Uses optimized SEO utility functions for better search performance
 */
export function useBlogSEO({ article, slug }: UseBlogSEOProps) {
  // Generate optimized SEO data using utility function
  const seoConfig = useMemo(() => {
    const seoData = generateBlogSEO(article, slug);
    return {
      title: seoData.title,
      description: seoData.description,
      keywords: seoData.keywords,
      type: 'article' as const,
      canonical: seoData.canonical,
      structuredData: seoData.structuredData,
      breadcrumbs: seoData.breadcrumbs,
    };
  }, [article, slug]);

  return {
    structuredData: seoConfig.structuredData,
    breadcrumbs: seoConfig.breadcrumbs,
    seoConfig,
  };
}

/**
 * Helper function to generate article URL
 */
export function getArticleUrl(slug: string): string {
  return `${window.location.origin}/blog/${slug}`;
}

/**
 * Helper function to generate social sharing URLs
 */
export function getSocialShareUrls(article: BlogArticle, slug: string) {
  const url = encodeURIComponent(getArticleUrl(slug));
  const title = encodeURIComponent(article.title);
  const description = encodeURIComponent(article.description);

  return {
    twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    email: `mailto:?subject=${title}&body=${description}%0A%0A${url}`,
  };
}