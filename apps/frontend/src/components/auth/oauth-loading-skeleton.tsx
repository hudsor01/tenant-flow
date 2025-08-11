"use client"

import React from 'react'
import { cn } from '@/lib/utils'

interface OAuthLoadingSkeletonProps {
  provider?: string
  className?: string
}

export function OAuthLoadingSkeleton({ provider = "OAuth", className }: OAuthLoadingSkeletonProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Loading button skeleton */}
      <div className="w-full h-11 bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 rounded-md border border-gray-200 flex items-center justify-center animate-pulse">
        <div className="flex items-center gap-3">
          {/* Icon skeleton */}
          <div className="w-4 h-4 bg-gray-300 rounded animate-pulse" />
          
          {/* Text skeleton with shimmer effect */}
          <div className="relative overflow-hidden bg-gray-300 rounded h-4 w-32">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent animate-shimmer" />
          </div>
        </div>
      </div>
      
      {/* Optional loading message */}
      <div className="mt-2 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce" />
          <span className="ml-1">Connecting to {provider}...</span>
        </div>
      </div>
    </div>
  )
}

// Add shimmer animation to global CSS or Tailwind config
// @keyframes shimmer {
//   0% { transform: translateX(-100%); }
//   100% { transform: translateX(100%); }
// }
// .animate-shimmer { animation: shimmer 1.5s infinite; }