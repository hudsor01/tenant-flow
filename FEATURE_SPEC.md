# Apple Component Library Enhancement

**Branch:** `feature/apple-component-library`
**Type:** Enhancement
**Agent Assignment:** react-ui-specialist

## Scope

Update Button components with Apple motion tokens and 44px touch targets
- Implement card-apple containers with proper shadows and radius
- Add glass-apple overlay effects for modals
- Ensure all components pass 'bored browsing test'

## Acceptance Criteria

- [ ] All buttons use Apple motion tokens (--ease-out-expo, --duration-fast)
- [ ] 44px minimum touch targets for all interactive elements
- [ ] Cards have proper Apple shadows and borders
- [ ] Modal overlays use glass-apple effect
- [ ] Components are screenshot-worthy and satisfying to interact with
- [ ] Zero custom CSS - use design tokens only

## Implementation Notes

**Reference:** `apps/frontend/src/app/globals.css` Apple design system
**Blocked by:** None
**Depends on:** Apple design tokens (already implemented)

## Current Apple Design Tokens Available

From `apps/frontend/src/app/globals.css`:

### Motion Tokens
```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--duration-fast: 0.25s;
--duration-normal: 0.35s;
--duration-slow: 0.5s;
```

### Shadow Tokens
```css
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1);
--shadow-md: 0 4px 12px 0 rgb(0 0 0 / 0.1);
--shadow-lg: 0 8px 24px 0 rgb(0 0 0 / 0.12);
--shadow-xl: 0 16px 40px 0 rgb(0 0 0 / 0.15);
```

### Radius Tokens
```css
--radius-md: 12px;    /* Apple's standard radius */
--radius: 16px;
--radius-lg: 20px;
--radius-xl: 24px;
```

### Spacing Tokens (44px Touch Targets)
```css
--spacing-10: 40px;   /* Close to 44px for touch targets */
--spacing-12: 48px;   /* Exceeds 44px for comfort */
```

## Component Updates Required

### Buttons (`apps/frontend/src/components/ui/button.tsx`)
- Apply `--ease-out-expo` and `--duration-fast` to all transitions
- Ensure 44px minimum height for touch targets
- Use Apple shadows for depth

### Cards (All card components)
- Apply `--shadow-apple-md` for default cards
- Use `--radius-apple` for corner radius
- Implement hover states with Apple motion

### Modals/Dialogs
- Add glass-apple overlay backdrop
- Apply backdrop blur effect
- Use Apple motion for enter/exit animations

## Testing Criteria

**Bored Browsing Test:** Components should feel satisfying and polished when:
- Hovering over buttons and cards
- Opening/closing modals
- Interacting with any UI element
- Components should feel "Apple-like" in responsiveness

## Technical Implementation

1. **Motion System:** Use CSS custom properties for transitions
2. **Touch Targets:** Minimum 44px for all interactive elements
3. **Shadow System:** Consistent Apple-style shadows
4. **Glass Effects:** Backdrop blur for overlays
5. **Zero Custom CSS:** All styling via design tokens

## Success Metrics

- All interactive elements have satisfying micro-interactions
- Components feel polished and premium
- Design system consistency across all components
- Zero custom CSS outside of design tokens
- 44px accessibility compliance for touch targets