# UI Components

Shared UI components for TenantFlow.

## MapPlaceholder

A premium placeholder component for property cards when no image is available. Shows a static map of the Dallas-Fort Worth metroplex.

### Usage

```tsx
import { MapPlaceholder } from '@/components/ui/map-placeholder'

// In property cards - for aspect-video areas
{property.imageUrl ? (
  <img src={property.imageUrl} alt={property.name} className="..." />
) : (
  <MapPlaceholder className="absolute inset-0" />
)}

// For square thumbnails (table/list views)
<MapPlaceholder aspectRatio="square" className="w-full h-full" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `alt` | `string` | `'Dallas-Fort Worth area map'` | Alt text for the image |
| `aspectRatio` | `'video' \| 'square' \| 'wide'` | `'video'` | Aspect ratio of the placeholder |
| `staticMapUrl` | `string` | DFW map URL | Custom map URL if needed |
| `className` | `string` | - | Additional CSS classes |

### Features

- Shows DFW area map at reduced opacity (60% light, 40% dark)
- Subtle gradient overlay for better text contrast
- Falls back to gradient if image fails to load
- No API key required (uses Wikimedia Commons)
