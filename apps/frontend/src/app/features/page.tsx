'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Check, Trash2 } from 'lucide-react'
import { PageLayout } from '@/components/layout/page-layout'

// Import all features sections
import FeaturesSectionDemo3 from '@/components/magicui/features-section-demo-3'

const featuresComponents = [
  {
    id: 6,
    name: 'Features Demo 3 (MagicUI) - Selected',
    component: FeaturesSectionDemo3,
    description: 'MagicUI features with premium automation flow visualization - SELECTED FOR TENANTFLOW'
  }
]

export default function FeaturesGalleryPage() {
  const [selectedFeatures, setSelectedFeatures] = useState<number | null>(null)
  const [previewFeatures, setPreviewFeatures] = useState<number | null>(null)
  const [removedFeatures, setRemovedFeatures] = useState<number[]>([])

  const handleUseThis = (id: number) => {
    setSelectedFeatures(id)
  }

  const handleRemove = (id: number) => {
    setRemovedFeatures([...removedFeatures, id])
    if (selectedFeatures === id) {
      setSelectedFeatures(null)
    }
  }

  const handlePreview = (id: number) => {
    setPreviewFeatures(previewFeatures === id ? null : id)
  }

  const activeFeatures = featuresComponents.filter(feature => !removedFeatures.includes(feature.id))

  if (previewFeatures) {
    const featureToPreview = featuresComponents.find(f => f.id === previewFeatures)
    if (featureToPreview) {
      const PreviewComponent = featureToPreview.component
      return (
        <div className="min-h-screen">
          <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50">
            <Button onClick={() => setPreviewFeatures(null)} variant="outline">
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
          <h1 className="text-4xl font-bold mb-4 text-gradient-steel">Features Section Gallery</h1>
          <p className="text-lg text-muted-foreground">
            Choose your preferred features section design. Click preview to see it full-screen, or select "Use This" to make it your choice.
          </p>
          {selectedFeatures && (
            <div className="mt-4">
              <Badge variant="outline" className="bg-steel-subtle">
                Selected: {featuresComponents.find(f => f.id === selectedFeatures)?.name}
              </Badge>
            </div>
          )}
        </div>

        <div className="grid gap-8">
          {activeFeatures.map((feature) => {
            const isSelected = selectedFeatures === feature.id
            return (
              <Card key={feature.id} className={`transition-all duration-300 ${isSelected ? 'ring-2 ring-blue-500 bg-steel-subtle' : 'hover:shadow-lg'}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold flex items-center gap-3">
                        <span className="text-2xl font-bold text-muted-foreground">#{feature.id}</span>
                        {feature.name}
                        {isSelected && <Badge className="bg-green-100 text-green-800">Selected</Badge>}
                      </h3>
                      <p className="text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                    <div className="flex gap-2 mt-4 md:mt-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePreview(feature.id)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        Preview
                      </Button>
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleUseThis(feature.id)}
                        className="flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        {isSelected ? "Selected" : "Use This"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemove(feature.id)}
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
                      <feature.component />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {activeFeatures.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No Features Sections Available</h3>
            <p className="text-muted-foreground mb-4">You've removed all features sections.</p>
            <Button onClick={() => setRemovedFeatures([])}>Restore All</Button>
          </div>
        )}

        {removedFeatures.length > 0 && (
          <div className="mt-8 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Removed Components ({removedFeatures.length})</h3>
            <div className="flex gap-2 flex-wrap">
              {removedFeatures.map(id => {
                const feature = featuresComponents.find(f => f.id === id)
                return (
                  <Badge key={id} variant="secondary" className="cursor-pointer" onClick={() => setRemovedFeatures(removedFeatures.filter(r => r !== id))}>
                    {feature?.name} ↻
                  </Badge>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-12 p-6 bg-sage-subtle rounded-lg">
          <h3 className="font-semibold mb-2">Need something different?</h3>
          <p className="text-muted-foreground mb-4">
            Don't see a features section you like? We can search for more options from our component libraries.
          </p>
          <Button variant="outline">Find More Features Sections</Button>
        </div>
      </div>
    </PageLayout>
  )
}