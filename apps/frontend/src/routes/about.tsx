import { createFileRoute } from '@tanstack/react-router'

function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">About TenantFlow</h1>
      <div className="prose prose-gray max-w-none">
        <p className="text-lg mb-4">
          TenantFlow is a comprehensive property management platform designed to streamline 
          the relationship between property owners and tenants.
        </p>
        <p>
          Our platform provides tools for property management, tenant communication, 
          maintenance tracking, and financial oversight - all in one place.
        </p>
      </div>
    </div>
  )
}

export const Route = createFileRoute('/about')({
  component: AboutPage,
})