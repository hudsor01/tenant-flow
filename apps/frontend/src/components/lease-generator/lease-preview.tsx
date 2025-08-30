'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, Eye, Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import type { LeaseFormData} from '@repo/shared';
import { useStateLeaseRequirements } from '@/hooks/use-state-lease-requirements'
import { useValidateLease } from '@/hooks/api/use-lease-api'

interface LeasePreviewProps {
  leaseData: LeaseFormData
  onGeneratePDF?: (data: LeaseFormData) => Promise<void>
  onDownloadPDF?: (data: LeaseFormData) => Promise<void>
  isGenerating?: boolean
  className?: string
}

export function LeasePreview({ 
  leaseData, 
  onGeneratePDF, 
  onDownloadPDF, 
  isGenerating = false,
  className = ''
}: LeasePreviewProps) {
  const [previewMode, setPreviewMode] = useState<'summary' | 'full'>('summary')
  
  // Get state requirements and validation
  const { data: stateRequirements } = useStateLeaseRequirements(leaseData.property.address.state)
  const { data: validation, isLoading: isValidating } = useValidateLease(leaseData)

  const { property } = leaseData

  const handleGeneratePDF = async () => {
    try {
      await onGeneratePDF?.(leaseData)
    } catch (error) {
      console.error('Error generating PDF:', error)
    }
  }

  const handleDownloadPDF = async () => {
    try {
      await onDownloadPDF?.(leaseData)
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lease Agreement Preview</h2>
          <p className="text-gray-600 mt-1">
            {stateRequirements?.stateName || property.address.state} • {formatPropertyType(property.type)}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(previewMode === 'summary' ? 'full' : 'summary')}
          >
            <Eye size={16} className="mr-2" />
            {previewMode === 'summary' ? 'Full Preview' : 'Summary'}
          </Button>
          
          <Button
            onClick={handleGeneratePDF}
            disabled={isGenerating || isValidating || validation?.valid === false}
            className="flex items-center space-x-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <FileText size={16} />
                <span>Generate PDF</span>
              </>
            )}
          </Button>
          
          {onDownloadPDF && (
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
            >
              <Download size={16} className="mr-2" />
              Download
            </Button>
          )}
        </div>
      </div>

      {/* Validation Status */}
      {validation && (
        <Card className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            {validation.valid ? (
              <>
                <CheckCircle className="text-green-500" size={20} />
                <span className="font-medium text-green-700">Ready to Generate</span>
              </>
            ) : (
              <>
                <AlertTriangle className="text-red-500" size={20} />
                <span className="font-medium text-red-700">Issues Found</span>
              </>
            )}
            <Badge variant={validation.valid ? "default" : "destructive"}>
              {stateRequirements?.stateName || property.address.state} Compliant
            </Badge>
          </div>

          {validation.errors.length > 0 && (
            <div className="space-y-1">
              <h4 className="font-medium text-red-700">Errors (Must Fix):</h4>
              {validation.errors.map((error, index) => (
                <div key={index} className="text-sm text-red-600 flex items-start space-x-2">
                  <span>•</span>
                  <span>{error.message}</span>
                </div>
              ))}
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="space-y-1 mt-3">
              <h4 className="font-medium text-yellow-700">Warnings (Recommended):</h4>
              {validation.warnings.map((warning, index) => (
                <div key={index} className="text-sm text-yellow-600 flex items-start space-x-2">
                  <span>•</span>
                  <div>
                    <div>{warning.message}</div>
                    {warning.suggestion && (
                      <div className="text-xs text-gray-600 mt-1">
                        <strong>Suggestion:</strong> {warning.suggestion}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {previewMode === 'summary' ? (
        <SummaryPreview leaseData={leaseData} />
      ) : (
        <FullPreview leaseData={leaseData} />
      )}
    </div>
  )
}

function SummaryPreview({ leaseData }: { leaseData: LeaseFormData }) {
  const { property, landlord, tenants, leaseTerms } = leaseData
  const mainTenant = tenants.find(t => t.isMainTenant) || tenants[0]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Property Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
          <FileText size={20} />
          <span>Property Details</span>
        </h3>
        <div className="space-y-3">
          <div>
            <div className="text-sm font-medium text-gray-700">Address</div>
            <div className="text-gray-900">
              {property.address.street}
              {property.address.unit && `, ${property.address.unit}`}<br />
              {property.address.city}, {property.address.state} {property.address.zipCode}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-700">Type</div>
              <div className="text-gray-900">{formatPropertyType(property.type)}</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Size</div>
              <div className="text-gray-900">{property.bedrooms} bed / {property.bathrooms} bath</div>
            </div>
          </div>
          {property.squareFeet && (
            <div>
              <div className="text-sm font-medium text-gray-700">Square Feet</div>
              <div className="text-gray-900">{property.squareFeet.toLocaleString()}</div>
            </div>
          )}
        </div>
      </Card>

      {/* Lease Terms Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Lease Terms</h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium text-gray-700">Monthly Rent</div>
              <div className="text-2xl font-bold text-green-600">
                ${(leaseTerms.rentAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">Security Deposit</div>
              <div className="text-xl font-semibold text-gray-900">
                ${(leaseTerms.securityDeposit.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Lease Period</div>
            <div className="text-gray-900">
              {formatDate(leaseTerms.startDate)}
              {leaseTerms.endDate && ` - ${formatDate(leaseTerms.endDate)}`}
              <Badge variant="outline" className="ml-2">
                {formatLeaseType(leaseTerms.type)}
              </Badge>
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-700">Rent Due</div>
            <div className="text-gray-900">{getOrdinal(leaseTerms.dueDate)} of each month</div>
          </div>
        </div>
      </Card>

      {/* Parties Summary */}
      <Card className="p-6 md:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Parties</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Landlord</h4>
            <div className="text-gray-900">
              <div className="font-medium">{landlord.name}</div>
              {landlord.isEntity && landlord.entityType && (
                <div className="text-sm text-gray-600">{landlord.entityType}</div>
              )}
              <div className="text-sm text-gray-600">{formatPhone(landlord.phone)}</div>
              <div className="text-sm text-gray-600">{landlord.email}</div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-2">
              Tenant{tenants.length > 1 ? 's' : ''}
            </h4>
            <div className="space-y-2">
              {mainTenant && (
                <div className="text-gray-900">
                  <div className="font-medium">{mainTenant.name} <Badge variant="outline" className="text-xs">Primary</Badge></div>
                  <div className="text-sm text-gray-600">{formatPhone(mainTenant.phone)}</div>
                  <div className="text-sm text-gray-600">{mainTenant.email}</div>
                </div>
              )}
              {tenants.filter(t => !t.isMainTenant).map((tenant, index) => (
                <div key={index} className="text-gray-900">
                  <div className="font-medium">{tenant.name}</div>
                  <div className="text-sm text-gray-600">{formatPhone(tenant.phone)}</div>
                  <div className="text-sm text-gray-600">{tenant.email}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

function FullPreview({ leaseData }: { leaseData: LeaseFormData }) {
  return (
    <Card className="p-8">
      <div className="max-w-none prose prose-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold uppercase tracking-wider">
            Residential Lease Agreement
          </h1>
          <div className="text-sm text-gray-600 mt-2">
            Generated for {leaseData.property.address.state}
          </div>
        </div>

        <div className="space-y-8">
          {/* Property Section */}
          <section>
            <h2 className="text-lg font-bold mb-4">1. RENTAL PROPERTY</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="mb-3">
                <strong>Property Address:</strong><br />
                {leaseData.property.address.street}
                {leaseData.property.address.unit && `, ${leaseData.property.address.unit}`}<br />
                {leaseData.property.address.city}, {leaseData.property.address.state} {leaseData.property.address.zipCode}
              </div>
              <div className="text-sm text-gray-700">
                <strong>Property Type:</strong> {formatPropertyType(leaseData.property.type)}<br />
                <strong>Bedrooms:</strong> {leaseData.property.bedrooms} | <strong>Bathrooms:</strong> {leaseData.property.bathrooms}
                {leaseData.property.squareFeet && (
                  <><br /><strong>Square Feet:</strong> {leaseData.property.squareFeet.toLocaleString()}</>
                )}
              </div>
            </div>
          </section>

          {/* More sections would be rendered here in full preview mode */}
          <div className="text-center py-8">
            <div className="text-gray-500">
              Full lease preview with all terms, conditions, and legal language will be shown here...
            </div>
            <Button className="mt-4" onClick={() => {}}>
              Generate Full PDF Preview
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

// Utility functions
function formatPropertyType(type: string): string {
  const types: Record<string, string> = {
    'single_family_home': 'Single Family Home',
    'apartment': 'Apartment',
    'condo': 'Condominium',
    'townhouse': 'Townhouse',
    'duplex': 'Duplex',
    'mobile_home': 'Mobile Home',
    'room_rental': 'Room Rental',
    'commercial': 'Commercial Property'
  }
  return types[type] || type
}

function formatLeaseType(type: string): string {
  const types: Record<string, string> = {
    'fixed_term': 'Fixed-Term',
    'month_to_month': 'Month-to-Month',
    'week_to_week': 'Week-to-Week',
    'at_will': 'At-Will'
  }
  return types[type] || type
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`
  }
  return phone
}

function getOrdinal(day: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'][day % 100 > 10 && day % 100 < 14 ? 0 : day % 10] || 'th'
  return day + suffix
}