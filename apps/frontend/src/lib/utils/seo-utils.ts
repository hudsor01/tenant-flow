/**
 * SEO utilities
 * Placeholder implementation for build fix
 */

interface SEOArticle {
  title?: string
  description?: string
  publishedAt?: string
  author?: string
  category?: string
  tags?: string[]
  image?: string
}

interface SEOData {
  title: string
  description: string
  keywords: string
  image?: string
  canonical: string
  structuredData: object
  breadcrumb: Array<{ name: string; url: string }>
}

export function generateBlogSEO(article: SEOArticle | null, slug: string): SEOData {
  // Placeholder implementation
  return {
    title: article?.title || 'Blog Article',
    description: article?.description || 'Read this blog article',
    keywords: 'blog, article',
    image: article?.image,
    canonical: `/blog/${slug}`,
    structuredData: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": article?.title || 'Blog Article',
      "description": article?.description || 'Read this blog article',
      "datePublished": article?.publishedAt || new Date().toISOString(),
      "author": {
        "@type": "Person",
        "name": article?.author || "TenantFlow"
      }
    },
    breadcrumb: [
      { name: 'Home', url: '/' },
      { name: 'Blog', url: '/blog' },
      { name: article?.title || 'Article', url: `/blog/${slug}` }
    ]
  }
}