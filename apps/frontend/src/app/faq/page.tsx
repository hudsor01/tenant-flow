'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Check, Trash2 } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'

// Import all FAQ sections
import { FAQSection, commonPricingFAQs } from '@/components/sections/faq-section'

// Create a wrapper component with default props
const FAQSectionWithDefaults = () => (
  <FAQSection 
    faqs={commonPricingFAQs}
    showCategories={true}
    title="Frequently Asked Questions"
    description="Everything you need to know about our platform"
  />
)

const faqComponents = [
  {
    id: 1,
    name: 'FAQ Section',
    component: FAQSectionWithDefaults,
    description: 'Interactive FAQ with categories, expandable sections, and predefined SaaS questions'
  }
]

export default function FaqGalleryPage() {
  const [selectedFaq, setSelectedFaq] = useState<number | null>(null)
  const [previewFaq, setPreviewFaq] = useState<number | null>(null)
  const [removedFaqs, setRemovedFaqs] = useState<number[]>([])

  const handleUseThis = (id: number) => {
    setSelectedFaq(id)
  }

  const handleRemove = (id: number) => {
    setRemovedFaqs([...removedFaqs, id])
    if (selectedFaq === id) {
      setSelectedFaq(null)
    }
  }

  const handlePreview = (id: number) => {
    setPreviewFaq(previewFaq === id ? null : id)
  }

  const activeFaqs = faqComponents.filter(faq => !removedFaqs.includes(faq.id))

  if (previewFaq) {
    const faqToPreview = faqComponents.find(f => f.id === previewFaq)
    if (faqToPreview) {
      const PreviewComponent = faqToPreview.component
      return (
        <div className="min-h-screen">
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
            <Button onClick={() => setPreviewFaq(null)} variant="outline">
              ← Back to Gallery
            </Button>
          </div>
          <PreviewComponent />
        </div>
      )
    }
  }

  return (
    <PageLayout>
      <div className="py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 text-gradient-steel">FAQ Section Gallery</h1>
          <p className="text-lg text-muted-foreground">
            Choose your preferred FAQ section design. Click preview to see it full-screen, or select "Use This" to make it your choice.
          </p>
          {selectedFaq && (
            <div className="mt-4">
              <Badge variant="outline" className="bg-steel-subtle">
                ✓ Selected: {faqComponents.find(f => f.id === selectedFaq)?.name}
              </Badge>
            </div>
          )}
        </div>

        <div className="grid gap-8">
          {activeFaqs.map((faq) => {
            const isSelected = selectedFaq === faq.id
            return (
              <Card key={faq.id} className={`transition-all duration-300 ${isSelected ? 'ring-2 ring-blue-500 bg-steel-subtle' : 'hover:shadow-lg'}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold flex items-center gap-3">
                        <span className="text-2xl font-bold text-muted-foreground">#{faq.id}</span>
                        {faq.name}
                        {isSelected && <Badge className="bg-green-100 text-green-800">Selected</Badge>}
                      </h3>
                      <p className="text-muted-foreground mt-1">{faq.description}</p>
                    </div>
                    <div className="flex gap-2 mt-4 md:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(faq.id)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleUseThis(faq.id)}
                        className="flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        {isSelected ? "Selected" : "Use This"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemove(faq.id)}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                  
                  {/* Mini preview */}
                  <div className="border rounded-lg overflow-hidden bg-slate-50 max-h-96">
                    <div className="scale-50 origin-top-left transform -m-1/2" style={{ width: '200%', height: '200%' }}>
                      <faq.component />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {activeFaqs.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No FAQ Sections Available</h3>
            <p className="text-muted-foreground mb-4">You've removed all FAQ sections.</p>
            <Button onClick={() => setRemovedFaqs([])}>Restore All</Button>
          </div>
        )}

        {removedFaqs.length > 0 && (
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Removed Components ({removedFaqs.length})</h3>
            <div className="flex gap-2 flex-wrap">
              {removedFaqs.map(id => {
                const faq = faqComponents.find(f => f.id === id)
                return (
                  <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => setRemovedFaqs(removedFaqs.filter(r => r !== id))}>
                    {faq?.name} ↻
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-12 p-6 bg-sage-subtle rounded-lg">
          <h3 className="font-semibold mb-2">Need something different?</h3>
          <p className="text-muted-foreground mb-4">
            Don't see a FAQ section you like? We can search for more options from our component libraries.
          </p>
          <Button variant="outline">Find More FAQ Sections</Button>
        </div>
      </div>
    </PageLayout>
  )
}