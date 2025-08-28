// Root page that imports from (public) route group
// This fixes Next.js 15 client-reference-manifest.js build error
import PublicHomePage from './(public)/page'

export default PublicHomePage

// Re-export metadata if it exists
export { metadata } from './(public)/page'
