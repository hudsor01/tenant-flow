import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Foundations/Shadows & Effects',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Shadow system and visual effects for depth and hierarchy.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const ElevationScale: Story = {
  render: () => (
    <div className="p-8 space-y-8 bg-gray-50">
      <section>
        <h2 className="text-2xl font-bold mb-6">Elevation Scale</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg">
            <p className="text-sm font-medium text-gray-600 mb-2">No Shadow</p>
            <p className="text-xs text-gray-500">shadow-none</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <p className="text-sm font-medium text-gray-600 mb-2">Small</p>
            <p className="text-xs text-gray-500">shadow-sm</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-sm font-medium text-gray-600 mb-2">Default</p>
            <p className="text-xs text-gray-500">shadow</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <p className="text-sm font-medium text-gray-600 mb-2">Medium</p>
            <p className="text-xs text-gray-500">shadow-md</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <p className="text-sm font-medium text-gray-600 mb-2">Large</p>
            <p className="text-xs text-gray-500">shadow-lg</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <p className="text-sm font-medium text-gray-600 mb-2">Extra Large</p>
            <p className="text-xs text-gray-500">shadow-xl</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-2xl">
            <p className="text-sm font-medium text-gray-600 mb-2">2X Large</p>
            <p className="text-xs text-gray-500">shadow-2xl</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-inner">
            <p className="text-sm font-medium text-gray-600 mb-2">Inner</p>
            <p className="text-xs text-gray-500">shadow-inner</p>
          </div>
        </div>
      </section>
    </div>
  ),
};

export const BorderRadius: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-6">Border Radius</h2>
        <div className="grid grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-500 mx-auto mb-2"></div>
            <p className="text-sm font-medium">None</p>
            <p className="text-xs text-gray-500">rounded-none</p>
          </div>
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-500 rounded-sm mx-auto mb-2"></div>
            <p className="text-sm font-medium">Small</p>
            <p className="text-xs text-gray-500">rounded-sm (2px)</p>
          </div>
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-500 rounded mx-auto mb-2"></div>
            <p className="text-sm font-medium">Default</p>
            <p className="text-xs text-gray-500">rounded (4px)</p>
          </div>
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-500 rounded-md mx-auto mb-2"></div>
            <p className="text-sm font-medium">Medium</p>
            <p className="text-xs text-gray-500">rounded-md (6px)</p>
          </div>
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-500 rounded-lg mx-auto mb-2"></div>
            <p className="text-sm font-medium">Large</p>
            <p className="text-xs text-gray-500">rounded-lg (8px)</p>
          </div>
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-500 rounded-xl mx-auto mb-2"></div>
            <p className="text-sm font-medium">Extra Large</p>
            <p className="text-xs text-gray-500">rounded-xl (12px)</p>
          </div>
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-500 rounded-2xl mx-auto mb-2"></div>
            <p className="text-sm font-medium">2X Large</p>
            <p className="text-xs text-gray-500">rounded-2xl (16px)</p>
          </div>
          <div className="text-center">
            <div className="w-24 h-24 bg-blue-500 rounded-full mx-auto mb-2"></div>
            <p className="text-sm font-medium">Full</p>
            <p className="text-xs text-gray-500">rounded-full</p>
          </div>
        </div>
      </section>
    </div>
  ),
};

export const HoverEffects: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-6">Hover Effects</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white border rounded-lg p-6 transition-shadow hover:shadow-lg cursor-pointer">
            <h3 className="font-semibold mb-2">Elevation on Hover</h3>
            <p className="text-sm text-gray-600">hover:shadow-lg</p>
          </div>
          <div className="bg-white border rounded-lg p-6 transition-colors hover:bg-gray-50 cursor-pointer">
            <h3 className="font-semibold mb-2">Background on Hover</h3>
            <p className="text-sm text-gray-600">hover:bg-gray-50</p>
          </div>
          <div className="bg-white border rounded-lg p-6 transition-all hover:scale-105 cursor-pointer">
            <h3 className="font-semibold mb-2">Scale on Hover</h3>
            <p className="text-sm text-gray-600">hover:scale-105</p>
          </div>
          <div className="bg-white border border-gray-300 rounded-lg p-6 transition-colors hover:border-brand-500 cursor-pointer">
            <h3 className="font-semibold mb-2">Border Color on Hover</h3>
            <p className="text-sm text-gray-600">hover:border-brand-500</p>
          </div>
          <div className="bg-blue-600 text-white rounded-lg p-6 transition-colors hover:bg-blue-700 cursor-pointer">
            <h3 className="font-semibold mb-2">Darken on Hover</h3>
            <p className="text-sm">hover:bg-blue-700</p>
          </div>
          <div className="bg-white border rounded-lg p-6 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer">
            <h3 className="font-semibold mb-2">Lift on Hover</h3>
            <p className="text-sm text-gray-600">hover:-translate-y-1</p>
          </div>
        </div>
      </section>
    </div>
  ),
};

export const FocusStates: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-6">Focus States</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Default Focus Ring</label>
            <input 
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Click to see focus ring"
            />
            <p className="text-xs text-gray-500 mt-1">focus:ring-2 focus:ring-blue-500</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Focus with Offset</label>
            <input 
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              placeholder="Click to see focus ring with offset"
            />
            <p className="text-xs text-gray-500 mt-1">focus:ring-2 focus:ring-blue-500 focus:ring-offset-2</p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Focus with Border Color</label>
            <input 
              className="px-3 py-2 border rounded-md focus:outline-none focus:border-brand-500"
              placeholder="Click to see border color change"
            />
            <p className="text-xs text-gray-500 mt-1">focus:border-brand-500</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
              Primary Button
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2">
              Secondary Button
            </button>
          </div>
        </div>
      </section>
    </div>
  ),
};

export const AnimationDurations: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-6">Animation Durations</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-blue-500 rounded transition-all duration-75 hover:scale-110"></div>
            <div>
              <p className="font-medium">Ultra Fast</p>
              <p className="text-sm text-gray-600">duration-75 (75ms)</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-emerald-500 rounded transition-all duration-150 hover:scale-110"></div>
            <div>
              <p className="font-medium">Fast</p>
              <p className="text-sm text-gray-600">duration-150 (150ms)</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-amber-500 rounded transition-all duration-300 hover:scale-110"></div>
            <div>
              <p className="font-medium">Normal</p>
              <p className="text-sm text-gray-600">duration-300 (300ms) - Default</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-purple-500 rounded transition-all duration-500 hover:scale-110"></div>
            <div>
              <p className="font-medium">Slow</p>
              <p className="text-sm text-gray-600">duration-500 (500ms)</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-red-500 rounded transition-all duration-700 hover:scale-110"></div>
            <div>
              <p className="font-medium">Slower</p>
              <p className="text-sm text-gray-600">duration-700 (700ms)</p>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-6">
          Hover over the squares to see the animation duration in action.
        </p>
      </section>
    </div>
  ),
};

export const ComponentExamples: Story = {
  render: () => (
    <div className="p-8 space-y-8 bg-gray-50">
      <section>
        <h2 className="text-2xl font-bold mb-6">Real Component Examples</h2>
        <div className="space-y-6">
          {/* Card with hover effect */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 p-6 cursor-pointer">
            <h3 className="text-lg font-semibold mb-2">Interactive Card</h3>
            <p className="text-gray-600">This card elevates on hover with smooth transition</p>
          </div>

          {/* Button group */}
          <div className="bg-white rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Button States</h3>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 active:bg-blue-800 transition-colors duration-150">
                Primary
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150">
                Secondary
              </button>
              <button className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors duration-150">
                Text Button
              </button>
            </div>
          </div>

          {/* Modal-like component */}
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md mx-auto">
            <h3 className="text-xl font-bold mb-4">Modal Shadow</h3>
            <p className="text-gray-600 mb-6">This uses shadow-2xl for maximum elevation, typically used for modals and overlays.</p>
            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md">Confirm</button>
              <button className="flex-1 px-4 py-2 border border-gray-300 rounded-md">Cancel</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  ),
};