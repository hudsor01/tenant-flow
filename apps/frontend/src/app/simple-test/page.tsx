'use client'

import { Button } from '@/components/ui/button'

export default function SimpleTestPage() {
  return (
    <div className="min-h-screen bg-background p-8 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Apple Components Simple Test</h1>
        <p className="text-lg text-muted-foreground">
          Testing basic button components with 44px touch targets
        </p>
      </div>

      <div className="space-y-8">
        <h2 className="text-2xl font-semibold">Button Size Tests</h2>

        <div className="flex flex-wrap gap-4">
          <Button size="xs">XS Button (32px)</Button>
          <Button size="sm">SM Button (36px)</Button>
          <Button size="default">Default (44px - Apple Standard)</Button>
          <Button size="lg">LG Button (48px)</Button>
          <Button size="xl">XL Button (56px)</Button>
        </div>

        <h2 className="text-2xl font-semibold">Button Variant Tests</h2>

        <div className="flex flex-wrap gap-4">
          <Button variant="default">Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>

        <h2 className="text-2xl font-semibold">Apple Motion Test</h2>

        <div className="p-8 border rounded-lg">
          <p className="mb-4">Hover and click these buttons to test Apple motion tokens:</p>
          <div className="flex gap-4">
            <Button>Hover for -1px lift</Button>
            <Button variant="outline">Click for scale(0.96)</Button>
          </div>
          <ul className="mt-4 text-sm text-muted-foreground space-y-1">
            <li>• Duration: 200ms (--duration-fast)</li>
            <li>• Easing: cubic-bezier(0.16, 1, 0.3, 1) (--ease-out-expo)</li>
            <li>• Shadow enhancement on hover</li>
          </ul>
        </div>
      </div>
    </div>
  )
}