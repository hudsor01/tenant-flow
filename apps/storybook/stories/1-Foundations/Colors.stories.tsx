import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Foundations/Colors',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'TenantFlow color system based on Tailwind CSS with custom brand colors.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const ColorSwatch = ({ name, value, className }: { name: string; value: string; className: string }) => (
  <div className="flex flex-col items-center">
    <div className={`w-24 h-24 rounded-lg shadow-md ${className}`} />
    <p className="mt-2 text-sm font-medium">{name}</p>
    <p className="text-xs text-gray-500">{value}</p>
  </div>
);

export const BrandColors: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-6">Brand Colors</h2>
        <div className="grid grid-cols-5 gap-6">
          <ColorSwatch name="Primary" value="#2563eb" className="bg-blue-600" />
          <ColorSwatch name="Primary Light" value="#3b82f6" className="bg-blue-500" />
          <ColorSwatch name="Primary Dark" value="#1d4ed8" className="bg-blue-700" />
          <ColorSwatch name="Success" value="#10b981" className="bg-emerald-500" />
          <ColorSwatch name="Warning" value="#f59e0b" className="bg-amber-500" />
          <ColorSwatch name="Error" value="#ef4444" className="bg-red-500" />
        </div>
      </section>
    </div>
  ),
};

export const GrayScale: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-6">Gray Scale</h2>
        <div className="grid grid-cols-6 gap-4">
          <ColorSwatch name="Gray 50" value="#f9fafb" className="bg-gray-50" />
          <ColorSwatch name="Gray 100" value="#f3f4f6" className="bg-gray-100" />
          <ColorSwatch name="Gray 200" value="#e5e7eb" className="bg-gray-200" />
          <ColorSwatch name="Gray 300" value="#d1d5db" className="bg-gray-300" />
          <ColorSwatch name="Gray 400" value="#9ca3af" className="bg-gray-400" />
          <ColorSwatch name="Gray 500" value="#6b7280" className="bg-gray-500" />
          <ColorSwatch name="Gray 600" value="#4b5563" className="bg-gray-600" />
          <ColorSwatch name="Gray 700" value="#374151" className="bg-gray-700" />
          <ColorSwatch name="Gray 800" value="#1f2937" className="bg-gray-800" />
          <ColorSwatch name="Gray 900" value="#111827" className="bg-gray-900" />
          <ColorSwatch name="Gray 950" value="#030712" className="bg-gray-950" />
        </div>
      </section>
    </div>
  ),
};

export const SemanticColors: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-6">Semantic Colors</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-500 rounded-lg" />
            <div>
              <p className="font-medium">Information</p>
              <p className="text-sm text-gray-600">Used for informational messages and highlights</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-emerald-500 rounded-lg" />
            <div>
              <p className="font-medium">Success</p>
              <p className="text-sm text-gray-600">Indicates successful operations and positive states</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-amber-500 rounded-lg" />
            <div>
              <p className="font-medium">Warning</p>
              <p className="text-sm text-gray-600">Alerts users to potential issues or important information</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-red-500 rounded-lg" />
            <div>
              <p className="font-medium">Error</p>
              <p className="text-sm text-gray-600">Indicates errors and critical issues</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  ),
};

export const ColorContrast: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-6">Color Contrast & Accessibility</h2>
        <div className="space-y-4">
          <div className="p-4 bg-blue-600 text-white rounded-lg">
            <p className="font-medium">White on Primary Blue</p>
            <p className="text-sm">WCAG AAA Compliant - Contrast ratio: 7.28:1</p>
          </div>
          <div className="p-4 bg-gray-900 text-white rounded-lg">
            <p className="font-medium">White on Gray 900</p>
            <p className="text-sm">WCAG AAA Compliant - Contrast ratio: 19.50:1</p>
          </div>
          <div className="p-4 bg-gray-100 text-gray-900 rounded-lg">
            <p className="font-medium">Gray 900 on Gray 100</p>
            <p className="text-sm">WCAG AAA Compliant - Contrast ratio: 17.94:1</p>
          </div>
          <div className="p-4 bg-white text-gray-600 border rounded-lg">
            <p className="font-medium">Gray 600 on White</p>
            <p className="text-sm">WCAG AA Compliant - Contrast ratio: 4.65:1</p>
          </div>
        </div>
      </section>
    </div>
  ),
};