/**
 * Announcement Bar - Server Component
 * Static promotional banner with limited-time offer
 */

import { Sparkles } from 'lucide-react'

export function AnnouncementBar() {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white py-2 px-4 text-center text-sm font-medium">
      <span className="inline-flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        Limited Time: Get 2 months FREE with annual billing
        <Sparkles className="w-4 h-4" />
      </span>
    </div>
  )
}