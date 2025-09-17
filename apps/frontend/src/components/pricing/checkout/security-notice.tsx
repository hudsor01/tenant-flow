"use client"

import { CheckCircle2, Lock, Shield, TrendingUp, Users } from 'lucide-react'

type Props = {
  business?: { trustSignals?: string[] }
  showTrustSignals?: boolean
}

export function SecurityNotice({ business, showTrustSignals = true }: Props) {
  return (
    <div className="space-y-4">
      <div className="bg-muted/20 rounded-lg p-4 border border-muted/40">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-success" />
          <span className="ui-label">Bank-Level Security</span>
        </div>
        <div className="grid grid-cols-2 gap-3 body-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Lock className="h-3 w-3 text-primary" />
            <span>256-bit SSL encryption</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="h-3 w-3 text-success" />
            <span>PCI DSS compliant</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-primary" />
            <span>Powered by Stripe</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-success" />
            <span>Growing customer base</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 text-primary" />
            <span>10,000+ active users</span>
          </div>
        </div>
      </div>

      {showTrustSignals && business?.trustSignals && (
        <div className="text-center">
          <p className="body-sm text-muted-foreground">Trusted by property managers worldwide</p>
          <div className="flex flex-wrap justify-center gap-2">
            {business.trustSignals.slice(0, 2).map((signal, index) => (
              <span key={index} className="badge">
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

