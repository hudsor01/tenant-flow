'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LeaseFormWizard } from '@/components/lease-generator/lease-form-wizard'
import { LeasePreview } from '@/components/lease-generator/lease-preview'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, FileText, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

import type { LeaseFormData } from '@repo/shared'
import { generateLease, triggerLeaseDownload } from '@/lib/api/lease-api'

type PageStep = 'form' | 'preview' | 'generated'

export default function LeaseGeneratorPage() {
  const [currentStep, setCurrentStep] = useState<PageStep>('form')
  const [leaseData, setLeaseData] = useState<LeaseFormData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null)
  const router = useRouter()

  const handleFormComplete = (data: LeaseFormData) => {
    setLeaseData(data)
    setCurrentStep('preview')
    
    toast.success('Lease form completed! Review your details before generating.')
  }

  const handleGeneratePDF = async (data: LeaseFormData) => {
    setIsGenerating(true)
    
    try {
      const result = await generateLease(data)
      
      if (result.success && result.lease) {
        setGeneratedPdfUrl(result.lease.downloadUrl)
        setCurrentStep('generated')
        toast.success('Lease agreement generated successfully!')
      } else {
        throw new Error('Invalid response from server')
      }
      
    } catch (error) {
      console.error('Error generating lease PDF:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to generate lease agreement. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDownloadPDF = async (_data: LeaseFormData) => {
    try {
      if (generatedPdfUrl) {
        const filename = generatedPdfUrl.split('/').pop() || 'lease-agreement.pdf'
        const customName = `lease-agreement-${new Date().toISOString().slice(0, 10)}.pdf`
        
        await triggerLeaseDownload(filename, customName)
        toast.success('PDF download started')
      } else {
        toast.error('No PDF available to download')
      }
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF')
    }
  }

  const handleStartOver = () => {
    setCurrentStep('form')
    setLeaseData(null)
    setGeneratedPdfUrl(null)
  }

  const handleBackToForm = () => {
    setCurrentStep('form')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="flex items-center space-x-2"
              >
                <ArrowLeft size={16} />
                <span>Back to Dashboard</span>
              </Button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center space-x-2">
                <FileText className="text-blue-600" size={24} />
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Lease Generator</h1>
                  <p className="text-sm text-gray-600">Create state-compliant lease agreements</p>
                </div>
              </div>
            </div>
            
            {/* Step Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
                currentStep === 'form' 
                  ? 'bg-blue-100 text-blue-700' 
                  : currentStep === 'preview'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-purple-100 text-purple-700'
              }`}>
                <Sparkles size={16} />
                <span>
                  {currentStep === 'form' && 'Step 1: Form Details'}
                  {currentStep === 'preview' && 'Step 2: Review & Generate'}
                  {currentStep === 'generated' && 'Step 3: Download Ready'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentStep === 'form' && (
          <LeaseFormWizard
            onGenerate={handleFormComplete}
            initialData={leaseData || undefined}
            isGenerating={isGenerating}
          />
        )}

        {currentStep === 'preview' && leaseData && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handleBackToForm}
                className="flex items-center space-x-2"
              >
                <ArrowLeft size={16} />
                <span>Back to Form</span>
              </Button>
            </div>
            
            <LeasePreview
              leaseData={leaseData}
              onGeneratePDF={handleGeneratePDF}
              onDownloadPDF={handleDownloadPDF}
              isGenerating={isGenerating}
            />
          </div>
        )}

        {currentStep === 'generated' && leaseData && (
          <Card className="max-w-2xl mx-auto p-8 text-center">
            <div className="space-y-6">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <FileText className="text-green-600" size={32} />
                </div>
              </div>
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Lease Agreement Generated!
                </h2>
                <p className="text-gray-600">
                  Your state-compliant lease agreement is ready for download.
                </p>
              </div>

              {/* Lease Summary */}
              <div className="bg-gray-50 rounded-lg p-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-4">Lease Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Property:</span>
                    <div className="text-gray-600">
                      {leaseData.property.address.street}, {leaseData.property.address.city}, {leaseData.property.address.state}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Monthly Rent:</span>
                    <div className="text-gray-600">
                      ${(leaseData.leaseTerms.rentAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Lease Term:</span>
                    <div className="text-gray-600">
                      {new Date(leaseData.leaseTerms.startDate).toLocaleDateString()} - {
                        leaseData.leaseTerms.endDate 
                          ? new Date(leaseData.leaseTerms.endDate).toLocaleDateString()
                          : 'Month-to-Month'
                      }
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Tenants:</span>
                    <div className="text-gray-600">
                      {leaseData.tenants.length} tenant{leaseData.tenants.length > 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => handleDownloadPDF(leaseData)}
                  className="flex items-center space-x-2"
                >
                  <FileText size={16} />
                  <span>Download PDF</span>
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleStartOver}
                >
                  Generate Another Lease
                </Button>
                
                <Button
                  variant="ghost"
                  onClick={() => router.push('/dashboard')}
                >
                  Return to Dashboard
                </Button>
              </div>

              {/* Tips */}
              <div className="text-left bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📋 Next Steps:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Review the lease agreement carefully with legal counsel</li>
                  <li>• Have all parties sign and date the document</li>
                  <li>• Provide copies to all tenants</li>
                  <li>• Keep the original in your property management files</li>
                </ul>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}