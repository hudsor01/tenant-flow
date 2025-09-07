import { Card } from '@/components/ui/card';

interface DesignTokensShowcaseProps {
  showThemeSwitcher?: boolean;
}

export function DesignTokensShowcase({ showThemeSwitcher: _showThemeSwitcher = true }: DesignTokensShowcaseProps) {
  const colors = [
    { name: 'Primary', class: 'bg-primary' },
    { name: 'Secondary', class: 'bg-secondary' },
    { name: 'Accent', class: 'bg-accent' },
    { name: 'Muted', class: 'bg-muted' },
  ];

  const spacing = [
    { name: 'xs', class: 'p-1' },
    { name: 'sm', class: 'p-2' },
    { name: 'md', class: 'p-4' },
    { name: 'lg', class: 'p-8' },
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Design Tokens Showcase</h2>
        <p className="text-muted-foreground mb-6">
          A comprehensive overview of the design system tokens used throughout the application.
        </p>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Color Palette</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {colors.map((color) => (
            <Card key={color.name} className="p-4">
              <div className={`w-full h-12 rounded mb-2 ${color.class}`} />
              <p className="text-sm font-medium">{color.name}</p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Spacing System</h3>
        <div className="space-y-2">
          {spacing.map((space) => (
            <div key={space.name} className="flex items-center gap-4">
              <span className="w-8 text-sm font-mono">{space.name}</span>
              <div className={`bg-primary h-4 ${space.class}`} style={{ width: 'fit-content' }} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xl font-semibold mb-4">Typography</h3>
        <div className="space-y-2">
          <p className="text-4xl font-bold">Heading 1</p>
          <p className="text-2xl font-semibold">Heading 2</p>
          <p className="text-lg font-medium">Body Large</p>
          <p className="text-base">Body Regular</p>
          <p className="text-sm text-muted-foreground">Caption</p>
        </div>
      </div>
    </div>
  );
}