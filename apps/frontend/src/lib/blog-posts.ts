/**
 * Blog posts configuration
 * Add your blog posts here - they'll automatically appear on the blog index and have individual pages
 */

export interface BlogPost {
	slug: string
	title: string
	excerpt: string
	content: string
	author: string
	date: string
	readTime: string
	category: string
	tags: string[]
}

/**
 * All blog posts
 * Add new posts to this array
 */
export const blogPosts: BlogPost[] = [
	{
		slug: 'example-blog-post',
		title: 'Example Blog Post - Replace with Your Content',
		excerpt: 'This is a placeholder blog post. You can replace this with your actual 3,000 word content with high-resolution images.',
		content: `
# Welcome to Your Blog

This is a template for your blog posts. You can write your content here using markdown-style formatting.

## Getting Started

Replace this content with your actual blog post. The template supports:

- Clean, readable typography
- Proper heading hierarchy
- Code blocks and quotes
- Responsive images
- Consistent spacing

## Writing Your Content

When you write your blog posts, you can use HTML or markdown. The styling is already set up to match the TenantFlow design system.

### Key Features

1. **Consistent Design**: Matches homepage aesthetics
2. **Responsive Layout**: Works perfectly on mobile and desktop
3. **SEO Ready**: Proper heading structure and meta tags
4. **Fast Loading**: Optimized for performance

## Adding Images

You can add images by placing them in \`public/blog/\` and referencing them:

\`\`\`html
<img src="/blog/your-image.jpg" alt="Description" />
\`\`\`

## Code Examples

The template supports code blocks with proper formatting:

\`\`\`typescript
const tenantFlow = {
  feature: "property management",
  status: "awesome"
}
\`\`\`

## Conclusion

This template is ready for your content. Just update the \`blogPosts\` array in \`lib/blog-posts.ts\` with your actual posts.
		`,
		author: 'TenantFlow Team',
		date: 'March 15, 2024',
		readTime: '8 min read',
		category: 'Getting Started',
		tags: ['tutorial', 'getting-started', 'blog']
	}
	// Add more blog posts here:
	// {
	//   slug: 'your-second-post',
	//   title: 'Your Second Post Title',
	//   excerpt: 'Brief description...',
	//   content: 'Full content...',
	//   author: 'Your Name',
	//   date: 'March 20, 2024',
	//   readTime: '10 min read',
	//   category: 'Product Updates',
	//   tags: ['feature', 'announcement']
	// }
]

/**
 * Get a single blog post by slug
 */
export function getBlogPost(slug: string): BlogPost | undefined {
	return blogPosts.find(post => post.slug === slug)
}

/**
 * Get all blog posts (sorted by date, newest first)
 */
export function getAllBlogPosts(): BlogPost[] {
	return blogPosts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

/**
 * Get blog posts by category
 */
export function getBlogPostsByCategory(category: string): BlogPost[] {
	return blogPosts.filter(post => post.category === category)
}

/**
 * Get featured/recent blog posts for homepage
 */
export function getFeaturedBlogPosts(limit: number = 3): BlogPost[] {
	return getAllBlogPosts().slice(0, limit)
}
