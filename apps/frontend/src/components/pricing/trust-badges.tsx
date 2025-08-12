import React from 'react'
import { Shield, Lock, CreditCard, Award } from 'lucide-react'

export function TrustBadges() {
  return (
    <div className="flex flex-wrap justify-center gap-4 md:gap-8 py-8">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Shield className="h-5 w-5" />
        <span className="text-sm">SOC 2 Compliant</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Lock className="h-5 w-5" />
        <span className="text-sm">Bank-level Security</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <CreditCard className="h-5 w-5" />
        <span className="text-sm">PCI Compliant</span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Award className="h-5 w-5" />
        <span className="text-sm">99.9% Uptime</span>
      </div>
    </div>
  )
}