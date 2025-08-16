import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';

const meta = {
  title: 'Foundations/Typography',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Typography system with Inter font family and consistent scale.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const TypeScale: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-6">Type Scale</h2>
        <div className="space-y-4">
          <div className="border-b pb-4">
            <div className="text-6xl font-bold">Display</div>
            <code className="text-sm text-gray-600">text-6xl (60px) · font-bold</code>
          </div>
          <div className="border-b pb-4">
            <div className="text-5xl font-bold">Heading 1</div>
            <code className="text-sm text-gray-600">text-5xl (48px) · font-bold</code>
          </div>
          <div className="border-b pb-4">
            <div className="text-4xl font-bold">Heading 2</div>
            <code className="text-sm text-gray-600">text-4xl (36px) · font-bold</code>
          </div>
          <div className="border-b pb-4">
            <div className="text-3xl font-semibold">Heading 3</div>
            <code className="text-sm text-gray-600">text-3xl (30px) · font-semibold</code>
          </div>
          <div className="border-b pb-4">
            <div className="text-2xl font-semibold">Heading 4</div>
            <code className="text-sm text-gray-600">text-2xl (24px) · font-semibold</code>
          </div>
          <div className="border-b pb-4">
            <div className="text-xl font-medium">Heading 5</div>
            <code className="text-sm text-gray-600">text-xl (20px) · font-medium</code>
          </div>
          <div className="border-b pb-4">
            <div className="text-lg font-medium">Heading 6</div>
            <code className="text-sm text-gray-600">text-lg (18px) · font-medium</code>
          </div>
          <div className="border-b pb-4">
            <div className="text-base">Body Large</div>
            <code className="text-sm text-gray-600">text-base (16px) · font-normal</code>
          </div>
          <div className="border-b pb-4">
            <div className="text-sm">Body Small</div>
            <code className="text-sm text-gray-600">text-sm (14px) · font-normal</code>
          </div>
          <div className="border-b pb-4">
            <div className="text-xs">Caption</div>
            <code className="text-sm text-gray-600">text-xs (12px) · font-normal</code>
          </div>
        </div>
      </section>
    </div>
  ),
};

export const FontWeights: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-6">Font Weights</h2>
        <div className="space-y-3">
          <div className="text-2xl font-thin">Thin (100)</div>
          <div className="text-2xl font-extralight">Extra Light (200)</div>
          <div className="text-2xl font-light">Light (300)</div>
          <div className="text-2xl font-normal">Normal (400)</div>
          <div className="text-2xl font-medium">Medium (500)</div>
          <div className="text-2xl font-semibold">Semibold (600)</div>
          <div className="text-2xl font-bold">Bold (700)</div>
          <div className="text-2xl font-extrabold">Extra Bold (800)</div>
          <div className="text-2xl font-black">Black (900)</div>
        </div>
      </section>
    </div>
  ),
};

export const LineHeight: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-6">Line Height</h2>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold mb-3">Tight (1.25)</h3>
            <p className="text-base leading-tight bg-gray-50 p-4 border-l-4 border-brand-500">
              This paragraph demonstrates tight line height. It's useful for headings and short text blocks where you want a more compact appearance. The lines are closer together.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Normal (1.5)</h3>
            <p className="text-base leading-normal bg-gray-50 p-4 border-l-4 border-emerald-500">
              This paragraph demonstrates normal line height. It's the default for body text and provides good readability. This is what most of your content should use.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Relaxed (1.625)</h3>
            <p className="text-base leading-relaxed bg-gray-50 p-4 border-l-4 border-amber-500">
              This paragraph demonstrates relaxed line height. It provides more breathing room between lines, which can improve readability for longer passages of text.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-3">Loose (2)</h3>
            <p className="text-base leading-loose bg-gray-50 p-4 border-l-4 border-purple-500">
              This paragraph demonstrates loose line height. It provides maximum spacing between lines and is useful for special cases where extra emphasis on readability is needed.
            </p>
          </div>
        </div>
      </section>
    </div>
  ),
};

export const TextColors: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-6">Text Colors</h2>
        <div className="space-y-4">
          <div className="p-4 bg-white border rounded-lg">
            <p className="text-gray-900 text-lg font-medium mb-1">Primary Text</p>
            <p className="text-gray-600">text-gray-900 - Used for headings and important content</p>
          </div>
          <div className="p-4 bg-white border rounded-lg">
            <p className="text-gray-700 text-lg font-medium mb-1">Secondary Text</p>
            <p className="text-gray-600">text-gray-700 - Used for body text</p>
          </div>
          <div className="p-4 bg-white border rounded-lg">
            <p className="text-gray-600 text-lg font-medium mb-1">Muted Text</p>
            <p className="text-gray-600">text-gray-600 - Used for descriptions and secondary information</p>
          </div>
          <div className="p-4 bg-white border rounded-lg">
            <p className="text-gray-500 text-lg font-medium mb-1">Disabled Text</p>
            <p className="text-gray-600">text-gray-500 - Used for disabled states and placeholders</p>
          </div>
          <div className="p-4 bg-gray-900 rounded-lg">
            <p className="text-white text-lg font-medium mb-1">Inverted Text</p>
            <p className="text-gray-300">text-white - Used on dark backgrounds</p>
          </div>
          <div className="p-4 bg-white border rounded-lg">
            <p className="text-blue-600 text-lg font-medium mb-1">Link Text</p>
            <p className="text-gray-600">text-blue-600 - Used for links and interactive text</p>
          </div>
          <div className="p-4 bg-white border rounded-lg">
            <p className="text-emerald-600 text-lg font-medium mb-1">Success Text</p>
            <p className="text-gray-600">text-emerald-600 - Used for success messages</p>
          </div>
          <div className="p-4 bg-white border rounded-lg">
            <p className="text-red-600 text-lg font-medium mb-1">Error Text</p>
            <p className="text-gray-600">text-red-600 - Used for error messages</p>
          </div>
        </div>
      </section>
    </div>
  ),
};

export const CommonPatterns: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <section>
        <h2 className="text-2xl font-bold mb-6">Common Typography Patterns</h2>
        <div className="space-y-8">
          {/* Page Header */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-500">Page Header</h3>
            <h1 className="text-3xl font-bold text-gray-900">Property Management</h1>
            <p className="text-gray-600 mt-2">Manage all your properties in one place</p>
          </div>

          {/* Card Header */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-500">Card Header</h3>
            <div className="border rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-900">Monthly Revenue</h2>
              <p className="text-sm text-gray-600 mt-1">Total income from all properties</p>
              <p className="text-3xl font-bold text-gray-900 mt-4">$24,500</p>
            </div>
          </div>

          {/* Form Labels */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-500">Form Labels</h3>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property Name
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <input 
                  className="w-full px-3 py-2 border rounded-md text-gray-900" 
                  placeholder="Enter property name"
                />
                <p className="text-xs text-gray-500 mt-1">This will be displayed to tenants</p>
              </div>
            </div>
          </div>

          {/* Table Headers */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-500">Table Headers</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">
                    Property
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">
                    Status
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-2">
                    Rent
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2 text-gray-900">Sunset Apartments</td>
                  <td className="py-2 text-gray-700">Occupied</td>
                  <td className="py-2 text-gray-900 text-right font-medium">$2,500</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Button Text */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-500">Button Text</h3>
            <div className="flex gap-3">
              <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md text-sm">
                Save Changes
              </button>
              <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-md text-sm">
                Cancel
              </button>
              <button className="px-4 py-2 text-blue-600 font-medium text-sm">
                Learn More →
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  ),
};