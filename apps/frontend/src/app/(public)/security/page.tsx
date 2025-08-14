import type { Metadata } from '@/types/next.d'
import { SecurityContent } from '@/components/pages/security-content'

export const metadata: Metadata = {
  title: 'Security & Compliance - Enterprise-Grade Protection | TenantFlow',
  description: 'Learn about TenantFlow\'s comprehensive security measures, compliance certifications, and data protection protocols. Enterprise-grade security you can trust.',
  openGraph: {
    title: 'Security & Compliance - TenantFlow',
    description: 'Enterprise-grade security, comprehensive compliance, and robust data protection for your property management needs.',
    images: [{ url: '/security-og-image.jpg' }],
  },
}

export default function SecurityPage() {
  return <SecurityContent />
}