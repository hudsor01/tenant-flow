import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'

export default function FeaturesPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Features</h1>
        <p className="text-lg text-gray-600 mb-8">Coming soon...</p>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  )
}