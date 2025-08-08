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
          className="text-lg px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
        >
          Start Free 14-Day Trial
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </Link>
      <Link href="/demo">
        <Button 
          size="lg" 
          variant="outline" 
          className="text-lg px-8 border-2 hover:bg-gray-50"
        >
          <Calendar className="mr-2 h-5 w-5" />
          Book a Demo
        </Button>
      </Link>
    </div>
  )
}