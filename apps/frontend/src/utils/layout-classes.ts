/**
 * Consolidated Tailwind layout utility classes
 * Reduces duplication of common flex layout patterns
 */

// Flex container utilities
export const flexLayouts = {
    // Basic flex containers
    row: 'flex flex-row',
    col: 'flex flex-col',
    
    // Centered content
    center: 'flex items-center justify-center',
    centerVertical: 'flex items-center',
    centerHorizontal: 'flex justify-center',
    
    // Space distribution
    between: 'flex items-center justify-between',
    around: 'flex items-center justify-around',
    evenly: 'flex items-center justify-evenly',
    end: 'flex items-center justify-end',
    start: 'flex items-center justify-start',
    
    // Column layouts with spacing
    colGap2: 'flex flex-col gap-2',
    colGap3: 'flex flex-col gap-3',
    colGap4: 'flex flex-col gap-4',
    colGap6: 'flex flex-col gap-6',
    colGap8: 'flex flex-col gap-8',
    
    // Row layouts with spacing
    rowGap2: 'flex flex-row gap-2',
    rowGap3: 'flex flex-row gap-3',
    rowGap4: 'flex flex-row gap-4',
    rowGap6: 'flex flex-row gap-6',
    rowGap8: 'flex flex-row gap-8',
    
    // Common combinations
    rowCenter: 'flex flex-row items-center justify-center',
    rowBetween: 'flex flex-row items-center justify-between',
    rowStart: 'flex flex-row items-center justify-start',
    rowEnd: 'flex flex-row items-center justify-end',
    
    colCenter: 'flex flex-col items-center justify-center',
    colStart: 'flex flex-col items-start justify-start',
    
    // Responsive flex
    responsiveFlex: 'flex flex-col sm:flex-row',
    responsiveReverse: 'flex flex-row sm:flex-col',
    
    // Wrap variants
    wrap: 'flex flex-wrap',
    wrapCenter: 'flex flex-wrap items-center justify-center',
    wrapBetween: 'flex flex-wrap items-center justify-between'
} as const

// Grid layout utilities
export const gridLayouts = {
    // Basic grids
    cols1: 'grid grid-cols-1',
    cols2: 'grid grid-cols-2',
    cols3: 'grid grid-cols-3',
    cols4: 'grid grid-cols-4',
    
    // Responsive grids
    responsiveCols: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    cardGrid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    
    // Grid with gaps
    gap2: 'gap-2',
    gap3: 'gap-3',
    gap4: 'gap-4',
    gap6: 'gap-6',
    gap8: 'gap-8',
    
    // Common grid patterns
    autoFit: 'grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))]',
    autoFill: 'grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'
} as const

// Container utilities
export const containers = {
    // Max width containers
    maxWidthSm: 'max-w-sm mx-auto',
    maxWidthMd: 'max-w-md mx-auto',
    maxWidthLg: 'max-w-lg mx-auto',
    maxWidthXl: 'max-w-xl mx-auto',
    maxWidth2Xl: 'max-w-2xl mx-auto',
    maxWidth4Xl: 'max-w-4xl mx-auto',
    maxWidth6Xl: 'max-w-6xl mx-auto',
    
    // Full width with padding
    fullWidthPadded: 'w-full px-4 sm:px-6 lg:px-8',
    
    // Section containers
    section: 'w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    sectionNarrow: 'w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'
} as const

// Spacing utilities
export const spacing = {
    // Margin combinations
    mx2: 'mx-2',
    mx4: 'mx-4',
    mx6: 'mx-6',
    my2: 'my-2',
    my4: 'my-4',
    my6: 'my-6',
    my8: 'my-8',
    
    // Padding combinations
    p4: 'p-4',
    p6: 'p-6',
    p8: 'p-8',
    px4: 'px-4',
    px6: 'px-6',
    py4: 'py-4',
    py6: 'py-6',
    py8: 'py-8',
    
    // Space between elements
    spaceY2: 'space-y-2',
    spaceY3: 'space-y-3',
    spaceY4: 'space-y-4',
    spaceY6: 'space-y-6',
    spaceX2: 'space-x-2',
    spaceX3: 'space-x-3',
    spaceX4: 'space-x-4'
} as const

// Position utilities
export const positioning = {
    // Absolute positioning
    absoluteCenter: 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2',
    absoluteTopRight: 'absolute top-0 right-0',
    absoluteTopLeft: 'absolute top-0 left-0',
    absoluteBottomRight: 'absolute bottom-0 right-0',
    absoluteBottomLeft: 'absolute bottom-0 left-0',
    
    // Fixed positioning
    fixedTopRight: 'fixed top-0 right-0',
    fixedBottomRight: 'fixed bottom-0 right-0',
    
    // Relative with inset
    inset0: 'inset-0',
    insetX0: 'inset-x-0',
    insetY0: 'inset-y-0'
} as const

// Helper function to combine layout classes
export function combineLayouts(...layouts: string[]): string {
    return layouts.filter(Boolean).join(' ')
}

// Type-safe layout class getter with function overloads
export function getLayoutClass<T extends keyof typeof flexLayouts>(
    category: 'flex',
    key: T
): typeof flexLayouts[T];
export function getLayoutClass<T extends keyof typeof gridLayouts>(
    category: 'grid',
    key: T
): typeof gridLayouts[T];
export function getLayoutClass<T extends keyof typeof containers>(
    category: 'container',
    key: T
): typeof containers[T];
export function getLayoutClass<T extends keyof typeof spacing>(
    category: 'spacing',
    key: T
): typeof spacing[T];
export function getLayoutClass<T extends keyof typeof positioning>(
    category: 'position',
    key: T
): typeof positioning[T];
// Implementation signature
export function getLayoutClass(
    category: 'flex' | 'grid' | 'container' | 'spacing' | 'position',
    key: string
): string {
    const layouts = {
        flex: flexLayouts,
        grid: gridLayouts,
        container: containers,
        spacing: spacing,
        position: positioning
    } as const
    
    const categoryLayouts = layouts[category]
    if (!categoryLayouts) return ''
    
    return (categoryLayouts as Record<string, string>)[key] || ''
}