'use client'

import { Button } from '@/components/ui/button'
import { ChevronRight, Calendar } from 'lucide-react'
import Link from 'next/link'

export function CTAMinimal() {
  return (
    <section>
      <div className="bg-muted py-16 md:py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <h2 className="text-foreground max-w-lg text-balance text-3xl font-semibold lg:text-4xl">
                <span className="text-muted-foreground">Streamline Operations.</span> Scale Faster.
              </h2>
              <p className="mt-4 text-lg text-muted-foreground max-w-md">
                Stop managing properties manually. Let TenantFlow handle the repetitive tasks 
                so you can focus on growing your portfolio.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 shrink-0">
              <Button asChild className="pr-2">
                <Link href="/auth/sign-up" className="group">
                  Try TenantFlow Free
                  <ChevronRight
                    strokeWidth={2.5}
                    className="size-3.5 ml-2 opacity-60 group-hover:translate-x-1 transition-transform"
                  />
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="pl-2.5">
                <Link href="/demo">
                  <Calendar
                    className="!size-3.5 mr-2 opacity-60"
                    strokeWidth={2.5}
                  />
                  Book a Demo
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}