'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, Calendar } from 'lucide-react'

export function HeroButtons() {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-400">
      <Link href="/signup">
        <Button 
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Start Free 14-Day Trial
        </Button>
      </Link>
      <Link href="/demo">
        <Button 
          size="lg" 
          variant="outline"
          leftIcon={<Calendar className="h-4 w-4" />}
        >
          Book a Demo
        </Button>
      </Link>
    </div>
  )
}