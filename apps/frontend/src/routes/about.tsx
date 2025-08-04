import { createFileRoute } from '@tanstack/react-router'
import { Navigation } from '@/components/layout/Navigation'

function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] text-white">
      <Navigation context="public" transparent={true} />
      <div className="max-w-4xl mx-auto px-4 py-24">
        <h1 className="text-5xl font-bold mb-8">About TenantFlow</h1>
        <div className="prose prose-invert max-w-none">
          <p className="text-xl mb-6 text-white/80 leading-relaxed">
            TenantFlow is a comprehensive property management platform designed to streamline 
            the relationship between property owners and tenants.
          </p>
          <p className="text-lg text-white/70 leading-relaxed">
            Our platform provides tools for property management, tenant communication, 
            maintenance tracking, and financial oversight - all in one place.
          </p>
        </div>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/about')({
  component: AboutPage,
})