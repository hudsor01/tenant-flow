import type { UseFormReturn } from 'react-hook-form'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { FileText, Download } from 'lucide-react'
import type { LeaseGeneratorForm, LeaseOutputFormat } from '@/types/lease-generator'

interface GenerationSummaryProps {
  form: UseFormReturn<LeaseGeneratorForm>
  selectedFormat: LeaseOutputFormat
  onFormatChange: (format: LeaseOutputFormat) => void
  isGenerating: boolean
}

export function GenerationSummary({ form, selectedFormat, onFormatChange }: GenerationSummaryProps) {
  const formData = form.getValues()

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lease Summary
          </CardTitle>
          <CardDescription>Review your lease details before generating</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Property Details */}
          <div>
            <h4 className="font-medium mb-2">Property</h4>
            <p className="text-sm text-muted-foreground">
              {formData.propertyAddress}, {formData.city}, {formData.state} {formData.zipCode}
            </p>
          </div>

          {/* Parties */}
          <div>
            <h4 className="font-medium mb-2">Parties</h4>
            <p className="text-sm text-muted-foreground">
              Landlord: {formData.landlordName}
            </p>
            <p className="text-sm text-muted-foreground">
              Tenant: {formData.tenantNames?.map(t => t.name).join(', ')}
            </p>
          </div>

          {/* Lease Terms */}
          <div>
            <h4 className="font-medium mb-2">Terms</h4>
            <p className="text-sm text-muted-foreground">
              Rent: ${formData.rentAmount}/month
            </p>
            <p className="text-sm text-muted-foreground">
              Start Date: {formData.leaseStartDate}
            </p>
            <p className="text-sm text-muted-foreground">
              End Date: {formData.leaseEndDate}
            </p>
          </div>

          {/* Additional Terms */}
          <div>
            <h4 className="font-medium mb-2">Additional Terms</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Pet Policy: {formData.petPolicy}</Badge>
              <Badge variant="secondary">Security Deposit: ${formData.securityDeposit}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Output Format Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Output Format
          </CardTitle>
          <CardDescription>Choose how you'd like to receive your lease</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select value={selectedFormat} onValueChange={(value: string) => onFormatChange(value as LeaseOutputFormat)}>
              <SelectTrigger id="format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF Document</SelectItem>
                <SelectItem value="docx">Word Document</SelectItem>
                <SelectItem value="preview">Preview Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}