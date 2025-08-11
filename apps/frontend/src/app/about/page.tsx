import type { Metadata } from '@/types/next.d'
import { AboutContent } from '@/components/pages/about-content'

export const metadata: Metadata = {
  title: 'About TenantFlow - Revolutionizing Property Management',
  description: 'Learn about TenantFlow\'s mission to simplify property management through innovative technology and exceptional user experience.',
  openGraph: {
    title: 'About TenantFlow - Our Story & Mission',
    description: 'Discover how TenantFlow is transforming property management with modern tools and exceptional support.',
    images: [{ url: '/about-og-image.jpg' }],
  },
}

export default function AboutPage() {
  return <AboutContent />
}