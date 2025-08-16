import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Palette,
  Type,
  Grid3x3,
  CornerDownRight,
  Layers,
  Eye,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';

const meta = {
  title: '🎨 Design System/Design Tokens',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'Comprehensive design system tokens for TenantFlow - colors, typography, spacing, and more.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

// Color palette component
const ColorPalette: React.FC<{ title: string; colors: Array<{ name: string; value: string; description: string }> }> = ({ 
  title, 
  colors 
}) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Palette className="h-5 w-5" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {colors.map(({ name, value, description }) => (
          <div key={name} className="text-center">
            <div 
              className="w-full h-16 rounded-lg border shadow-sm mb-2"
              style={{ backgroundColor: value }}
            />
            <div className="text-sm font-medium">{name}</div>
            <div className="text-xs text-gray-500 font-mono">{value}</div>
            <div className="text-xs text-gray-600 mt-1">{description}</div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Typography scale component
const TypographyScale: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Type className="h-5 w-5" />
        Typography Scale
      </CardTitle>
      <CardDescription>Consistent type sizes and line heights based on modular scale</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-baseline gap-4 p-4 border rounded-lg">
            <div className="text-xs text-gray-500 w-20">text-xs</div>
            <div className="text-xs">The quick brown fox jumps over the lazy dog</div>
            <div className="text-xs text-gray-400 ml-auto font-mono">12px / 16px</div>
          </div>
          <div className="flex items-baseline gap-4 p-4 border rounded-lg">
            <div className="text-xs text-gray-500 w-20">text-sm</div>
            <div className="text-sm">The quick brown fox jumps over the lazy dog</div>
            <div className="text-xs text-gray-400 ml-auto font-mono">14px / 20px</div>
          </div>
          <div className="flex items-baseline gap-4 p-4 border rounded-lg">
            <div className="text-xs text-gray-500 w-20">text-base</div>
            <div className="text-base">The quick brown fox jumps over the lazy dog</div>
            <div className="text-xs text-gray-400 ml-auto font-mono">16px / 24px</div>
          </div>
          <div className="flex items-baseline gap-4 p-4 border rounded-lg">
            <div className="text-xs text-gray-500 w-20">text-lg</div>
            <div className="text-lg">The quick brown fox jumps over the lazy dog</div>
            <div className="text-xs text-gray-400 ml-auto font-mono">18px / 28px</div>
          </div>
          <div className="flex items-baseline gap-4 p-4 border rounded-lg">
            <div className="text-xs text-gray-500 w-20">text-xl</div>
            <div className="text-xl">The quick brown fox jumps over the lazy dog</div>
            <div className="text-xs text-gray-400 ml-auto font-mono">20px / 28px</div>
          </div>
          <div className="flex items-baseline gap-4 p-4 border rounded-lg">
            <div className="text-xs text-gray-500 w-20">text-2xl</div>
            <div className="text-2xl font-semibold">The quick brown fox</div>
            <div className="text-xs text-gray-400 ml-auto font-mono">24px / 32px</div>
          </div>
          <div className="flex items-baseline gap-4 p-4 border rounded-lg">
            <div className="text-xs text-gray-500 w-20">text-3xl</div>
            <div className="text-3xl font-bold">The quick brown</div>
            <div className="text-xs text-gray-400 ml-auto font-mono">30px / 36px</div>
          </div>
          <div className="flex items-baseline gap-4 p-4 border rounded-lg">
            <div className="text-xs text-gray-500 w-20">text-4xl</div>
            <div className="text-4xl font-bold">TenantFlow</div>
            <div className="text-xs text-gray-400 ml-auto font-mono">36px / 40px</div>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Typography Guidelines</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Use font-normal (400) for body text</li>
            <li>• Use font-medium (500) for labels and secondary headings</li>
            <li>• Use font-semibold (600) for primary headings</li>
            <li>• Use font-bold (700) for emphasis and hero text</li>
            <li>• Maintain 1.5x line height for readability</li>
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Spacing system component
const SpacingSystem: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Grid3x3 className="h-5 w-5" />
        Spacing System
      </CardTitle>
      <CardDescription>8px grid system for consistent spacing and alignment</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[
          { name: 'xs', value: '0.5', px: '2px', description: 'Micro spacing' },
          { name: 'sm', value: '1', px: '4px', description: 'Fine adjustments' },
          { name: 'base', value: '2', px: '8px', description: 'Base unit' },
          { name: 'md', value: '3', px: '12px', description: 'Small gaps' },
          { name: 'lg', value: '4', px: '16px', description: 'Standard spacing' },
          { name: 'xl', value: '6', px: '24px', description: 'Section spacing' },
          { name: '2xl', value: '8', px: '32px', description: 'Component spacing' },
          { name: '3xl', value: '12', px: '48px', description: 'Layout spacing' },
          { name: '4xl', value: '16', px: '64px', description: 'Section breaks' },
          { name: '5xl', value: '20', px: '80px', description: 'Page sections' },
        ].map(({ name, value, px, description }) => (
          <div key={name} className="flex items-center gap-4 p-3 border rounded-lg">
            <div className="text-sm font-mono w-16">{name}</div>
            <div className="text-sm font-mono w-12 text-gray-500">{value}</div>
            <div className="text-sm font-mono w-16 text-blue-600">{px}</div>
            <div 
              className="bg-blue-500 h-4 rounded"
              style={{ width: px }}
            />
            <div className="text-sm text-gray-600 flex-1">{description}</div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-green-50 rounded-lg">
        <h4 className="font-semibold text-green-800 mb-2">Spacing Best Practices</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• Always use multiples of 8px (0.5rem increments)</li>
          <li>• Use consistent spacing within similar components</li>
          <li>• Increase spacing to create visual hierarchy</li>
          <li>• Use smaller spacing for related elements</li>
          <li>• Test spacing on mobile devices (touch targets)</li>
        </ul>
      </div>
    </CardContent>
  </Card>
);

// Border radius component
const BorderRadiusScale: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <CornerDownRight className="h-5 w-5" />
        Border Radius
      </CardTitle>
      <CardDescription>Consistent corner radius for modern interface design</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { name: 'none', value: '0', class: 'rounded-none' },
          { name: 'sm', value: '2px', class: 'rounded-sm' },
          { name: 'base', value: '4px', class: 'rounded' },
          { name: 'md', value: '6px', class: 'rounded-md' },
          { name: 'lg', value: '8px', class: 'rounded-lg' },
          { name: 'xl', value: '12px', class: 'rounded-xl' },
          { name: '2xl', value: '16px', class: 'rounded-2xl' },
          { name: 'full', value: '9999px', class: 'rounded-full' },
        ].map(({ name, value, class: className }) => (
          <div key={name} className="text-center">
            <div className={`w-16 h-16 bg-blue-500 mx-auto mb-2 ${className}`} />
            <div className="text-sm font-medium">{name}</div>
            <div className="text-xs text-gray-500">{value}</div>
            <div className="text-xs font-mono text-gray-400">{className}</div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Elevation/Shadow system
const ElevationSystem: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Layers className="h-5 w-5" />
        Elevation System
      </CardTitle>
      <CardDescription>Layered shadows for depth and hierarchy</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {[
          { name: 'sm', description: 'Subtle elevation', class: 'shadow-sm' },
          { name: 'base', description: 'Default cards', class: 'shadow' },
          { name: 'md', description: 'Hover states', class: 'shadow-md' },
          { name: 'lg', description: 'Modals, dropdowns', class: 'shadow-lg' },
          { name: 'xl', description: 'Major overlays', class: 'shadow-xl' },
          { name: '2xl', description: 'Hero elements', class: 'shadow-2xl' },
        ].map(({ name, description, class: className }) => (
          <div key={name} className="text-center">
            <div className={`w-20 h-20 bg-white rounded-lg mx-auto mb-3 ${className} border`} />
            <div className="text-sm font-medium">{name}</div>
            <div className="text-xs text-gray-600">{description}</div>
            <div className="text-xs font-mono text-gray-400">{className}</div>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Responsive breakpoints
const ResponsiveBreakpoints: React.FC = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Eye className="h-5 w-5" />
        Responsive Breakpoints
      </CardTitle>
      <CardDescription>Mobile-first responsive design breakpoints</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        {[
          { name: 'sm', width: '640px', description: 'Small devices', icon: Smartphone },
          { name: 'md', width: '768px', description: 'Medium devices', icon: Tablet },
          { name: 'lg', width: '1024px', description: 'Large devices', icon: Monitor },
          { name: 'xl', width: '1280px', description: 'Extra large', icon: Monitor },
          { name: '2xl', width: '1536px', description: 'Ultra wide', icon: Monitor },
        ].map(({ name, width, description, icon: Icon }) => (
          <div key={name} className="flex items-center gap-4 p-4 border rounded-lg">
            <Icon className="h-6 w-6 text-blue-600" />
            <div className="flex-1">
              <div className="font-medium">{name}: {width}+</div>
              <div className="text-sm text-gray-600">{description}</div>
            </div>
            <Badge variant="outline" className="font-mono text-xs">{width}</Badge>
          </div>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-purple-50 rounded-lg">
        <h4 className="font-semibold text-purple-800 mb-2">Responsive Guidelines</h4>
        <ul className="text-sm text-purple-700 space-y-1">
          <li>• Design mobile-first, progressively enhance</li>
          <li>• Test on actual devices, not just browser resize</li>
          <li>• Consider touch targets (44px minimum)</li>
          <li>• Optimize content hierarchy for small screens</li>
          <li>• Use appropriate breakpoints for content, not devices</li>
        </ul>
      </div>
    </CardContent>
  </Card>
);

export const ColorSystem: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Design Tokens</h1>
        <p className="text-xl text-gray-600">Foundational elements of the TenantFlow design system</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ColorPalette
          title="Primary Colors"
          colors={[
            { name: 'Blue 50', value: '#eff6ff', description: 'Light background' },
            { name: 'Blue 500', value: '#3b82f6', description: 'Primary brand' },
            { name: 'Blue 600', value: '#2563eb', description: 'Hover state' },
            { name: 'Blue 900', value: '#1e3a8a', description: 'Dark text' },
          ]}
        />
        
        <ColorPalette
          title="Semantic Colors"
          colors={[
            { name: 'Green 500', value: '#10b981', description: 'Success states' },
            { name: 'Red 500', value: '#ef4444', description: 'Error states' },
            { name: 'Yellow 500', value: '#f59e0b', description: 'Warning states' },
            { name: 'Gray 500', value: '#6b7280', description: 'Neutral text' },
          ]}
        />
      </div>

      <ColorPalette
        title="Gray Scale"
        colors={[
          { name: 'White', value: '#ffffff', description: 'Pure white' },
          { name: 'Gray 50', value: '#f9fafb', description: 'Background' },
          { name: 'Gray 100', value: '#f3f4f6', description: 'Subtle background' },
          { name: 'Gray 200', value: '#e5e7eb', description: 'Borders' },
          { name: 'Gray 300', value: '#d1d5db', description: 'Disabled states' },
          { name: 'Gray 400', value: '#9ca3af', description: 'Placeholder text' },
          { name: 'Gray 500', value: '#6b7280', description: 'Secondary text' },
          { name: 'Gray 600', value: '#4b5563', description: 'Primary text' },
          { name: 'Gray 700', value: '#374151', description: 'Headings' },
          { name: 'Gray 800', value: '#1f2937', description: 'Strong text' },
          { name: 'Gray 900', value: '#111827', description: 'Darkest text' },
          { name: 'Black', value: '#000000', description: 'Pure black' },
        ]}
      />
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Typography System</h1>
        <p className="text-xl text-gray-600">Harmonious type scale for readable interfaces</p>
      </div>
      
      <TypographyScale />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Font Weights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="font-normal">font-normal (400) - Body text</div>
              <div className="font-medium">font-medium (500) - Labels</div>
              <div className="font-semibold">font-semibold (600) - Headings</div>
              <div className="font-bold">font-bold (700) - Emphasis</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Text Colors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="text-gray-900">Primary text (gray-900)</div>
              <div className="text-gray-600">Secondary text (gray-600)</div>
              <div className="text-gray-400">Disabled text (gray-400)</div>
              <div className="text-blue-600">Link text (blue-600)</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  ),
};

export const SpacingAndLayout: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Spacing & Layout</h1>
        <p className="text-xl text-gray-600">Consistent spacing system based on 8px grid</p>
      </div>
      
      <SpacingSystem />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <BorderRadiusScale />
        <ElevationSystem />
      </div>
      
      <ResponsiveBreakpoints />
    </div>
  ),
};

export const ComponentTokens: Story = {
  render: () => (
    <div className="p-8 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Component Tokens</h1>
        <p className="text-xl text-gray-600">Semantic tokens applied to common UI components</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Button Tokens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button size="sm">Small Button</Button>
            <Button>Default Button</Button>
            <Button size="lg">Large Button</Button>
            <div className="text-xs text-gray-600 mt-4">
              Heights: 32px, 40px, 48px<br/>
              Padding: 12px-16px horizontal<br/>
              Border radius: 6px
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Card Tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <Card className="p-4 text-center">
              <div>Sample Card</div>
            </Card>
            <div className="text-xs text-gray-600 mt-4">
              Background: white<br/>
              Border: gray-200<br/>
              Shadow: sm<br/>
              Border radius: 8px
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Input Tokens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <input 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Sample input"
            />
            <div className="text-xs text-gray-600">
              Height: 40px<br/>
              Padding: 8px 12px<br/>
              Border: gray-300<br/>
              Focus: blue-500 ring
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Usage Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-green-800 mb-2">✅ Do</h4>
              <ul className="text-sm space-y-1">
                <li>• Use semantic tokens (primary, secondary)</li>
                <li>• Maintain consistent spacing ratios</li>
                <li>• Apply elevation purposefully</li>
                <li>• Test color contrast ratios</li>
                <li>• Use design tokens in code</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-red-800 mb-2">❌ Don't</h4>
              <ul className="text-sm space-y-1">
                <li>• Use arbitrary spacing values</li>
                <li>• Mix different border radius scales</li>
                <li>• Overuse high elevation shadows</li>
                <li>• Ignore responsive breakpoints</li>
                <li>• Hard-code color values</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};