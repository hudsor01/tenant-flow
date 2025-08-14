import { Shield, Lock, CheckCircle, Award, Globe, FileCheck } from 'lucide-react'

interface SecurityBadgesProps {
  className?: string
}

/**
 * Security and trust badges component
 * Displays security certifications and trust indicators
 */
export function SecurityBadges({ className }: SecurityBadgesProps) {
  return (
    <div className={`text-center py-16 ${className || ''}`}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Enterprise-Grade Security & Compliance
        </h2>
        <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
          Your data security is our top priority. TenantFlow meets the highest standards 
          for data protection and privacy compliance.
        </p>

        {/* Security badges grid */}
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-8 mb-12">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">SSL Encrypted</h3>
              <p className="text-sm text-gray-600">256-bit encryption</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">SOC 2 Compliant</h3>
              <p className="text-sm text-gray-600">Type II certified</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-purple-600" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">GDPR Ready</h3>
              <p className="text-sm text-gray-600">Privacy compliant</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <Award className="w-8 h-8 text-yellow-600" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">ISO 27001</h3>
              <p className="text-sm text-gray-600">Security certified</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Globe className="w-8 h-8 text-red-600" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">Global CDN</h3>
              <p className="text-sm text-gray-600">99.9% uptime</p>
            </div>
          </div>

          <div className="flex flex-col items-center space-y-3">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <FileCheck className="w-8 h-8 text-indigo-600" />
            </div>
            <div className="text-center">
              <h3 className="font-semibold text-gray-900">Regular Audits</h3>
              <p className="text-sm text-gray-600">Third-party verified</p>
            </div>
          </div>
        </div>

        {/* Additional security features */}
        <div className="bg-gray-50 rounded-2xl p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            What This Means for You
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Data Protection</h4>
              <p className="text-sm text-gray-600">
                Your sensitive property and tenant data is encrypted both in transit and at rest, 
                following banking-industry standards.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Privacy Compliance</h4>
              <p className="text-sm text-gray-600">
                Full GDPR and CCPA compliance ensures your tenant privacy rights are protected 
                according to the strictest global standards.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Business Continuity</h4>
              <p className="text-sm text-gray-600">
                Redundant infrastructure and daily backups ensure your business operations 
                continue uninterrupted, even during outages.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}