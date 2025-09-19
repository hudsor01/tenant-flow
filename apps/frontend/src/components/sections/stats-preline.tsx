import { Card } from '@/components/ui/card'
"use client"

import { cn } from '@/lib/utils'

export function StatsPreline({ className }: { className?: string }) {
  return (
    <section className={cn("py-12 lg:py-16", className)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">

          {/* Card 1 - Total Properties */}
          <div className="flex flex-col bg-background border shadow-sm rounded-xl">
            <div className="p-4 md:p-5">
              <div className="flex items-center gap-x-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Total Properties
                </p>
              </div>
              <div className="mt-1 flex items-center gap-x-2">
                <h3 className="text-xl sm:text-2xl font-medium text-foreground">
                  156
                </h3>
                <span className="flex items-center gap-x-1 text-accent">
                  <svg className="inline-block size-4 self-center" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                    <polyline points="16 7 22 7 22 13"></polyline>
                  </svg>
                  <span className="inline-block text-sm">
                    12.5%
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Card 2 - Active Tenants */}
          <div className="flex flex-col bg-background border shadow-sm rounded-xl">
            <div className="p-4 md:p-5">
              <div className="flex items-center gap-x-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Active Tenants
                </p>
              </div>
              <div className="mt-1 flex items-center gap-x-2">
                <h3 className="text-xl sm:text-2xl font-medium text-foreground">
                  1,284
                </h3>
                <span className="flex items-center gap-x-1 text-accent">
                  <svg className="inline-block size-4 self-center" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                    <polyline points="16 7 22 7 22 13"></polyline>
                  </svg>
                  <span className="inline-block text-sm">
                    8.2%
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Card 3 - Maintenance Requests */}
          <div className="flex flex-col bg-background border shadow-sm rounded-xl">
            <div className="p-4 md:p-5">
              <div className="flex items-center gap-x-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Open Requests
                </p>
              </div>
              <div className="mt-1 flex items-center gap-x-2">
                <h3 className="text-xl sm:text-2xl font-medium text-foreground">
                  24
                </h3>
                <span className="flex items-center gap-x-1 text-destructive">
                  <svg className="inline-block size-4 self-center" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 17 13.5 8.5 8.5 13.5 2 7"></polyline>
                    <polyline points="16 17 22 17 22 11"></polyline>
                  </svg>
                  <span className="inline-block text-sm">
                    15.3%
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Card 4 - Monthly Revenue */}
          <div className="flex flex-col bg-background border shadow-sm rounded-xl">
            <div className="p-4 md:p-5">
              <div className="flex items-center gap-x-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Monthly Revenue
                </p>
              </div>
              <div className="mt-1 flex items-center gap-x-2">
                <h3 className="text-xl sm:text-2xl font-medium text-foreground">
                  $284.5K
                </h3>
                <span className="flex items-center gap-x-1 text-accent">
                  <svg className="inline-block size-4 self-center" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                    <polyline points="16 7 22 7 22 13"></polyline>
                  </svg>
                  <span className="inline-block text-sm">
                    22.4%
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}