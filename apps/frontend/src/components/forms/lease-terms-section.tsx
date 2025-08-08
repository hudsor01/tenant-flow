/**
 * Lease Terms Section Component
 * 
 * Client component for managing dynamic lease terms and conditions.
 * Allows adding, editing, and removing custom lease terms.
 */

"use client"

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Plus, Trash2, FileText, AlertCircle } from 'lucide-react'
import type { LeaseTerm } from './lease-form-client'

// ============================================================================
// INTERFACES
// ============================================================================

interface LeaseTermsSectionProps {
  terms: LeaseTerm[]
  onChange: (terms: LeaseTerm[]) => void
}

interface LeaseTermCardProps {
  term: LeaseTerm
  index: number
  onUpdate: (index: number, updatedTerm: LeaseTerm) => void
  onRemove: (index: number) => void
}

// ============================================================================
// INDIVIDUAL TERM CARD COMPONENT
// ============================================================================

function LeaseTermCard({ term, index, onUpdate, onRemove }: LeaseTermCardProps) {
  const handleFieldChange = (field: keyof LeaseTerm, value: string | number) => {
    const updatedTerm = { ...term, [field]: value }
    onUpdate(index, updatedTerm)
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Term Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select 
                value={term.type} 
                onValueChange={(value: 'clause' | 'fee' | 'rule') => handleFieldChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clause">Clause</SelectItem>
                  <SelectItem value="fee">Fee</SelectItem>
                  <SelectItem value="rule">Rule</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Term Title */}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={term.title}
                onChange={(e) => handleFieldChange('title', e.target.value)}
                placeholder="Enter term title"
              />
            </div>
          </div>
          
          {/* Term Description */}
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={term.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              placeholder="Describe this lease term"
              rows={2}
            />
          </div>
          
          {/* Amount (for fee type) */}
          {term.type === 'fee' && (
            <div className="space-y-2">
              <Label>Amount ($)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={term.amount || ''}
                onChange={(e) => handleFieldChange('amount', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          )}
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onRemove(index)}
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}

// ============================================================================
// MAIN LEASE TERMS SECTION COMPONENT
// ============================================================================

export function LeaseTermsSection({ terms, onChange }: LeaseTermsSectionProps) {
  const [showDefaultTermsButton, setShowDefaultTermsButton] = useState(terms.length === 0)

  const addTerm = (termData: Omit<LeaseTerm, 'id'>) => {
    const newTerm: LeaseTerm = {
      ...termData,
      id: crypto.randomUUID()
    }
    const updatedTerms = [...terms, newTerm]
    onChange(updatedTerms)
    setShowDefaultTermsButton(false)
  }

  const updateTerm = (index: number, updatedTerm: LeaseTerm) => {
    const updatedTerms = terms.map((term, i) => i === index ? updatedTerm : term)
    onChange(updatedTerms)
  }

  const removeTerm = (index: number) => {
    const updatedTerms = terms.filter((_, i) => i !== index)
    onChange(updatedTerms)
    if (updatedTerms.length === 0) {
      setShowDefaultTermsButton(true)
    }
  }

  const addDefaultTerms = () => {
    const defaultTerms: Omit<LeaseTerm, 'id'>[] = [
      {
        type: 'clause',
        title: 'Pet Policy',
        description: 'No pets allowed without written permission'
      },
      {
        type: 'fee',
        title: 'Late Fee',
        description: 'Late payment fee after grace period',
        amount: 50
      },
      {
        type: 'rule',
        title: 'Noise Policy',
        description: 'Quiet hours from 10 PM to 8 AM'
      },
      {
        type: 'clause',
        title: 'Smoking Policy',
        description: 'No smoking inside the premises'
      }
    ]
    
    const newTerms = defaultTerms.map(term => ({
      ...term,
      id: crypto.randomUUID()
    }))
    
    onChange([...terms, ...newTerms])
    setShowDefaultTermsButton(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <h3 className="text-lg font-semibold">Lease Terms & Conditions</h3>
        </div>
        
        <div className="flex gap-2">
          {showDefaultTermsButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addDefaultTerms}
            >
              Add Default Terms
            </Button>
          )}
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addTerm({
              type: 'clause',
              title: '',
              description: ''
            })}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Term
          </Button>
        </div>
      </div>
      
      {terms.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No lease terms added yet. Click "Add Default Terms" to get started or "Add Term" to create a custom term.
          </AlertDescription>
        </Alert>
      )}
      
      {terms.map((term, index) => (
        <LeaseTermCard
          key={term.id}
          term={term}
          index={index}
          onUpdate={updateTerm}
          onRemove={removeTerm}
        />
      ))}
      
      {terms.length > 0 && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => addTerm({
              type: 'clause',
              title: '',
              description: ''
            })}
            className="text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Another Term
          </Button>
        </div>
      )}
    </div>
  )
}