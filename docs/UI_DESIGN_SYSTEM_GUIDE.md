# TenantFlow UI/UX Design System & Frontend Architecture Guide

## Document Purpose
This guide provides comprehensive instructions for designers and developers to construct, architect, and design the TenantFlow frontend UI. It serves as the single source of truth for UI/UX decisions, component patterns, and implementation standards.

---

## 1. Design Philosophy & Principles

### Core Design Values
1. **Clarity Over Cleverness**: Simple, intuitive interfaces that require zero training
2. **Performance First**: Every design decision must consider load time and runtime performance
3. **Accessibility by Default**: WCAG 2.1 AA compliance is non-negotiable
4. **Mobile-Responsive**: Design mobile-first, enhance for desktop
5. **Data-Dense Efficiency**: Property managers handle lots of data - optimize for information density without clutter

### Design Principles
- **Predictable Patterns**: Use consistent interaction patterns across all features
- **Progressive Disclosure**: Show only what's needed, reveal complexity gradually
- **Contextual Actions**: Place actions where users expect them
- **Visual Hierarchy**: Use typography, spacing, and color to guide attention
- **Feedback & State**: Always communicate system state and user action results

---

## 2. Brand & Visual Identity

### Color System

#### Primary Palette
```scss
// Brand Colors
$primary-600: #2563eb;     // Primary actions, links
$primary-500: #3b82f6;     // Hover states
$primary-400: #60a5fa;     // Active states
$primary-100: #dbeafe;     // Backgrounds

// Semantic Colors
$success: #10b981;         // Positive actions, confirmations
$warning: #f59e0b;         // Warnings, attention needed
$danger: #ef4444;          // Errors, destructive actions
$info: #3b82f6;           // Information, tips

// Neutral Scale
$gray-900: #111827;        // Primary text
$gray-700: #374151;        // Secondary text
$gray-500: #6b7280;        // Tertiary text, placeholders
$gray-300: #d1d5db;        // Borders
$gray-100: #f3f4f6;        // Backgrounds
$gray-50: #f9fafb;         // Subtle backgrounds
```

### Typography

#### Font Stack
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Courier New', monospace;
```

#### Type Scale
```scss
// Headings
$h1: 2.5rem (40px) - 700 weight - 1.2 line-height
$h2: 2rem (32px) - 600 weight - 1.3 line-height  
$h3: 1.5rem (24px) - 600 weight - 1.4 line-height
$h4: 1.25rem (20px) - 500 weight - 1.5 line-height
$h5: 1rem (16px) - 500 weight - 1.5 line-height

// Body
$body-lg: 1.125rem (18px) - 400 weight
$body: 1rem (16px) - 400 weight
$body-sm: 0.875rem (14px) - 400 weight
$caption: 0.75rem (12px) - 400 weight
```

### Spacing System
Use 8px grid system with consistent spacing tokens:
```scss
$space-xs: 4px;
$space-sm: 8px;
$space-md: 16px;
$space-lg: 24px;
$space-xl: 32px;
$space-2xl: 48px;
$space-3xl: 64px;
```

### Elevation & Shadows
```scss
$shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
$shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
$shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);
```

---

## 3. Component Architecture

### Technology Stack Requirements
- **Framework**: React 19 with Next.js 15 (App Router)
- **Bundler**: Turbopack (REQUIRED - webpack causes React 19 errors)
- **Component Library**: Radix UI primitives + custom components
- **Styling**: Tailwind CSS + CSS Modules for complex components
- **State Management**: Zustand for global state, React Query for server state
- **Animation**: Framer Motion for complex animations
- **Icons**: Lucide React icon library

### Component Structure

#### Base Component Template
```tsx
// components/ui/Component.tsx
'use client'; // Only if interactive

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { ComponentProps } from './Component.types';

export const Component = forwardRef<HTMLDivElement, ComponentProps>(
  ({ className, variant = 'default', size = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          componentVariants({ variant, size }),
          className
        )}
        {...props}
      />
    );
  }
);

Component.displayName = 'Component';
```

### Component Categories

#### 1. Layout Components
- **AppShell**: Main application wrapper with sidebar, header, content
- **PageContainer**: Consistent page wrapper with title, actions, content
- **Card**: Content container with consistent padding and shadows
- **Grid**: Responsive grid system for data layouts
- **Stack**: Vertical/horizontal spacing utility

#### 2. Navigation Components
- **Sidebar**: Collapsible navigation with icons and nested items
- **Breadcrumb**: Hierarchical navigation trail
- **Tabs**: Tab-based content switching
- **Pagination**: Data table pagination controls

#### 3. Form Components
- **Input**: Text, number, email, password variants
- **Select**: Single/multi-select with search
- **DatePicker**: Date/time selection with calendar
- **FileUpload**: Drag-and-drop file upload with preview
- **RichTextEditor**: WYSIWYG editor for descriptions

#### 4. Data Display Components
- **DataTable**: Sortable, filterable, paginated tables
- **StatCard**: Metric display with trend indicators
- **PropertyCard**: Property listing card with image carousel
- **TenantAvatar**: Consistent tenant display pattern
- **Timeline**: Activity/history display

#### 5. Feedback Components
- **Toast**: Non-blocking notifications
- **Alert**: In-page alerts and warnings
- **Modal**: Focused task dialogs
- **LoadingSpinner**: Consistent loading states
- **EmptyState**: No-data illustrations and CTAs

---

## 4. Page Layouts & User Flows

### Dashboard Layout
```
┌─────────────────────────────────────────────────┐
│ Header (Logo | Search | Notifications | Profile)│
├────────┬────────────────────────────────────────┤
│        │ Page Title            Actions          │
│ Side   ├────────────────────────────────────────┤
│ bar    │ KPI Cards (4 columns on desktop)       │
│        ├────────────────────────────────────────┤
│ Nav    │ Main Content Area                      │
│        │ - Data tables                          │
│        │ - Charts                               │
│        │ - Recent activity                      │
└────────┴────────────────────────────────────────┘
```

### List View Pattern
```
┌─────────────────────────────────────────────────┐
│ Page Header                                     │
│ Title | Description            [+ Add] [Filter] │
├─────────────────────────────────────────────────┤
│ Search Bar                     View Toggle      │
├─────────────────────────────────────────────────┤
│ Active Filters (chips)                          │
├─────────────────────────────────────────────────┤
│ Data Table / Card Grid                          │
│ - Sortable columns                              │
│ - Row actions                                   │
│ - Bulk selection                                │
├─────────────────────────────────────────────────┤
│ Pagination                                      │
└─────────────────────────────────────────────────┘
```

### Detail View Pattern
```
┌─────────────────────────────────────────────────┐
│ Breadcrumb > Navigation > Path                  │
├─────────────────────────────────────────────────┤
│ Entity Header                                   │
│ [Status] Title               [Edit] [Delete]    │
│ Metadata (Created, Updated, ID)                 │
├─────────────────────────────────────────────────┤
│ Tab Navigation                                  │
├─────────────────────────────────────────────────┤
│ Tab Content                                     │
│ - Overview: Summary cards and key metrics       │
│ - Details: Form fields in sections              │
│ - Activity: Timeline of changes                 │
│ - Related: Linked entities                      │
└─────────────────────────────────────────────────┘
```

---

## 5. Interaction Patterns

### Form Interactions
1. **Inline Validation**: Validate on blur, show errors below fields
2. **Auto-save**: Save drafts every 30 seconds for long forms
3. **Smart Defaults**: Pre-fill predictable values
4. **Progressive Forms**: Multi-step for complex workflows
5. **Confirmation**: Require confirmation for destructive actions

### Data Table Interactions
1. **Click to Select**: Single click selects row
2. **Hover Actions**: Show row actions on hover
3. **Inline Edit**: Double-click to edit simple values
4. **Bulk Operations**: Checkbox selection for multiple items
5. **Column Customization**: Show/hide and reorder columns

### Navigation Patterns
1. **Persistent Sidebar**: Always visible on desktop, drawer on mobile
2. **Breadcrumb Trail**: Show location in hierarchy
3. **Quick Actions**: Floating action button for primary action
4. **Command Palette**: Cmd+K for quick navigation
5. **Recent Items**: Quick access to recently viewed items

---

## 6. Responsive Design Requirements

### Breakpoints
```scss
$mobile: 0-639px;        // Single column, stacked layout
$tablet: 640px-1023px;   // Two column, condensed navigation
$desktop: 1024px-1279px; // Full layout, sidebar visible
$wide: 1280px+;          // Maximum width containers
```

### Mobile Adaptations
1. **Navigation**: Hamburger menu with full-screen drawer
2. **Tables**: Horizontal scroll with frozen first column
3. **Forms**: Single column, full-width inputs
4. **Cards**: Stack vertically, full width
5. **Modals**: Full screen on mobile

### Touch Targets
- Minimum 44x44px touch targets
- 8px minimum spacing between targets
- Hover states also work as focus states

---

## 7. Performance Guidelines

### Component Performance
1. **Lazy Load**: Use dynamic imports for heavy components
2. **Virtualization**: Implement for lists > 50 items
3. **Image Optimization**: Use Next.js Image with lazy loading
4. **Code Splitting**: Route-based splitting by default
5. **Memoization**: Use React.memo for expensive components

### Bundle Optimization
```javascript
// vite.config.ts requirements
- Keep React in main bundle (prevents Children errors)
- Split vendor chunks by frequency of change
- Inline small assets < 4KB
- Preload critical fonts
```

### Loading States
1. **Skeleton Screens**: Show layout structure while loading
2. **Progressive Enhancement**: Show content as it loads
3. **Optimistic Updates**: Update UI before server confirms
4. **Stale-While-Revalidate**: Show cached data, update in background

---

## 8. Accessibility Requirements

### WCAG 2.1 AA Compliance
1. **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
2. **Keyboard Navigation**: All interactive elements keyboard accessible
3. **Screen Readers**: Proper ARIA labels and roles
4. **Focus Management**: Visible focus indicators, logical tab order
5. **Error Handling**: Clear error messages with suggestions

### Required Attributes
```tsx
// Every interactive element needs:
- aria-label or aria-labelledby
- role (if not semantic HTML)
- aria-describedby for help text
- aria-invalid for form errors
- aria-busy for loading states
```

---

## 9. Implementation Patterns

### State Management Pattern
```tsx
// Global state with Zustand
const usePropertyStore = create((set) => ({
  properties: [],
  selectedProperty: null,
  setSelectedProperty: (property) => set({ selectedProperty: property }),
  // Actions are colocated with state
}));

// Server state with React Query
const useProperties = () => {
  return useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
```

### Error Boundary Pattern
```tsx
// Wrap features in error boundaries
<ErrorBoundary fallback={<ErrorFallback />}>
  <FeatureComponent />
</ErrorBoundary>
```

### Data Fetching Pattern
```tsx
// Parallel data fetching
const [properties, tenants] = await Promise.all([
  fetchProperties(),
  fetchTenants(),
]);

// Suspense boundaries for loading states
<Suspense fallback={<PropertySkeleton />}>
  <PropertyList />
</Suspense>
```

---

## 10. Testing Requirements

### Component Testing
1. **Unit Tests**: Every component has test coverage
2. **Integration Tests**: User flows are tested end-to-end
3. **Visual Regression**: Chromatic or Percy for UI changes
4. **Accessibility Tests**: Automated a11y testing with axe
5. **Performance Tests**: Bundle size and runtime metrics

### Test Patterns
```tsx
// Component test example
describe('PropertyCard', () => {
  it('renders property information', () => {
    render(<PropertyCard property={mockProperty} />);
    expect(screen.getByText(mockProperty.name)).toBeInTheDocument();
  });
  
  it('handles click events', async () => {
    const handleClick = jest.fn();
    render(<PropertyCard property={mockProperty} onClick={handleClick} />);
    await userEvent.click(screen.getByRole('article'));
    expect(handleClick).toHaveBeenCalledWith(mockProperty);
  });
});
```

---

## 11. Documentation Requirements

### Component Documentation
Each component needs:
1. **Props Interface**: TypeScript types with JSDoc comments
2. **Usage Examples**: Common use cases with code
3. **Accessibility Notes**: ARIA requirements and keyboard behavior
4. **Performance Notes**: Any special considerations
5. **Figma Link**: Link to design source

### Storybook Stories
```tsx
// Component.stories.tsx
export default {
  title: 'UI/Component',
  component: Component,
  parameters: {
    docs: {
      description: {
        component: 'Component description and usage guidelines',
      },
    },
  },
};

export const Default = {
  args: {
    variant: 'default',
    size: 'md',
  },
};
```

---

## 12. Design Handoff Process

### Designer Responsibilities
1. **Figma Files**: Organized by feature with component library
2. **Annotations**: Interaction notes and edge cases documented
3. **Assets**: Exported at 1x, 2x, 3x for all icons/images
4. **Prototypes**: Interactive prototypes for complex flows
5. **Design Tokens**: Exported as JSON for development

### Developer Requirements
1. **Component Review**: Review designs before implementation
2. **Clarification**: Ask questions about ambiguous interactions
3. **Implementation**: Follow this guide for consistency
4. **Documentation**: Update Storybook with new components
5. **QA**: Self-review against design before PR

---

## 13. Quality Checklist

### Before Component is Complete
- [ ] Matches design specifications exactly
- [ ] Responsive across all breakpoints
- [ ] Keyboard navigable
- [ ] Screen reader tested
- [ ] Loading and error states handled
- [ ] Performance optimized (< 50ms interaction)
- [ ] Unit tests written
- [ ] Storybook story created
- [ ] Props documented with TypeScript
- [ ] Accessibility audit passed

### Before Feature Launch
- [ ] End-to-end tests written
- [ ] Performance budget met (< 3s page load)
- [ ] Cross-browser tested (Chrome, Safari, Firefox, Edge)
- [ ] Mobile tested on real devices
- [ ] Analytics events implemented
- [ ] Error tracking configured
- [ ] Feature flag ready for gradual rollout
- [ ] Documentation updated
- [ ] Design review completed
- [ ] Accessibility review completed

---

## 14. Common UI Patterns

### Empty States
```tsx
<EmptyState
  icon={<BuildingIcon />}
  title="No properties yet"
  description="Add your first property to get started"
  action={
    <Button onClick={handleAddProperty}>
      Add Property
    </Button>
  }
/>
```

### Loading States
```tsx
// Skeleton loader matching content structure
<div className="space-y-4">
  <Skeleton className="h-8 w-48" /> {/* Title */}
  <Skeleton className="h-4 w-full" /> {/* Description */}
  <div className="grid grid-cols-3 gap-4">
    <Skeleton className="h-32" /> {/* Cards */}
  </div>
</div>
```

### Error States
```tsx
<Alert variant="error">
  <AlertIcon />
  <AlertTitle>Unable to load properties</AlertTitle>
  <AlertDescription>
    Please check your connection and try again.
  </AlertDescription>
  <AlertAction onClick={retry}>Retry</AlertAction>
</Alert>
```

### Confirmation Dialogs
```tsx
<ConfirmDialog
  title="Delete Property"
  description="This action cannot be undone. All units and data will be permanently deleted."
  confirmLabel="Delete"
  variant="danger"
  onConfirm={handleDelete}
/>
```

---

## 15. Animation & Transitions

### Micro-animations
```scss
// Standard transitions
$transition-fast: 150ms ease;
$transition-base: 200ms ease;
$transition-slow: 300ms ease;

// Spring animations for natural motion
$spring-bouncy: cubic-bezier(0.68, -0.55, 0.265, 1.55);
$spring-smooth: cubic-bezier(0.4, 0, 0.2, 1);
```

### Animation Patterns
1. **Page Transitions**: Fade in with subtle slide (200ms)
2. **Modal Entry**: Scale + fade from center (150ms)
3. **Dropdown**: Slide + fade from trigger (150ms)
4. **Loading**: Pulse or spin for indeterminate progress
5. **Success**: Check mark draw animation (300ms)

---

## Appendix A: Component Library

### Ready-to-Use Components
All components should be built with these Radix UI primitives as a base:
- Accordion, Alert Dialog, Aspect Ratio
- Avatar, Checkbox, Collapsible
- Context Menu, Dialog, Dropdown Menu
- Form, Hover Card, Label
- Menubar, Navigation Menu, Popover
- Progress, Radio Group, ScrollArea
- Select, Separator, Slider
- Switch, Tabs, Toast
- Toggle, Toggle Group, Tooltip

### Custom Components to Build
Priority order for implementation:
1. DataTable with sorting/filtering/pagination
2. PropertyCard with image carousel
3. StatCard with trend indicators
4. FileUpload with drag-and-drop
5. DateRangePicker for reports
6. Timeline for activity logs
7. RichTextEditor for descriptions
8. CommandPalette for quick actions

---

## Appendix B: Resources & References

### Design Resources
- **Figma UI Kit**: [Link to TenantFlow Design System]
- **Icon Library**: [Lucide Icons](https://lucide.dev)
- **Color Generator**: [Tailwind Color Palette](https://tailwindcss.com/docs/customizing-colors)
- **Type Scale**: [Type Scale Calculator](https://type-scale.com)

### Development Resources
- **Component Examples**: [Radix UI Examples](https://www.radix-ui.com/primitives)
- **Tailwind Components**: [Tailwind UI](https://tailwindui.com)
- **Animation Library**: [Framer Motion](https://www.framer.com/motion)
- **Testing Library**: [React Testing Library](https://testing-library.com/react)

### Accessibility Resources
- **WCAG Guidelines**: [WCAG 2.1](https://www.w3.org/WAI/WCAG21/quickref/)
- **Screen Reader Testing**: [NVDA](https://www.nvaccess.org) / [JAWS](https://www.freedomscientific.com)
- **Color Contrast**: [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- **Accessibility Audit**: [axe DevTools](https://www.deque.com/axe/devtools/)

---

*This document is version 1.0 and should be updated as the design system evolves. Last updated: January 2025*