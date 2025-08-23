/**
 * Blog utilities and stubs
 * Simple blog data helpers
 */

interface BlogArticle {
  id: string
  title: string
  slug: string
  excerpt: string
  category: string
  publishedAt: string
  tags: string[]
}

// Mock blog data for development
const mockArticles: BlogArticle[] = [
  {
    id: '1',
    title: 'Property Management Best Practices',
    slug: 'property-management-best-practices',
    excerpt: 'Learn the essential practices for effective property management.',
    category: 'Property Management',
    publishedAt: '2024-01-15',
    tags: ['property', 'management', 'tips']
  },
  {
    id: '2', 
    title: 'Tenant Screening Guide',
    slug: 'tenant-screening-guide',
    excerpt: 'A comprehensive guide to screening potential tenants.',
    category: 'Tenant Management',
    publishedAt: '2024-01-10',
    tags: ['tenants', 'screening', 'guide']
  }
]

export function useBlogArticle(slug: string) {
  return mockArticles.find(article => article.slug === slug)
}

export function useRelatedBlogArticles(category: string, excludeId?: string) {
  return mockArticles
    .filter(article => article.category === category && article.id !== excludeId)
    .slice(0, 3)
}