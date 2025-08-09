/**
 * Accessibility constants and utilities
 */

// Keyboard key constants
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End',
  TAB: 'Tab',
  PAGE_UP: 'PageUp',
  PAGE_DOWN: 'PageDown',
} as const

// ARIA attributes for common patterns
export const ARIA_ATTRIBUTES = {
  EXPANDED: 'aria-expanded',
  SELECTED: 'aria-selected',
  CHECKED: 'aria-checked',
  DISABLED: 'aria-disabled',
  HIDDEN: 'aria-hidden',
  LABEL: 'aria-label',
  LABELLEDBY: 'aria-labelledby',
  DESCRIBEDBY: 'aria-describedby',
  CONTROLS: 'aria-controls',
  OWNS: 'aria-owns',
  ACTIVEDESCENDANT: 'aria-activedescendant',
  LIVE: 'aria-live',
  ATOMIC: 'aria-atomic',
  RELEVANT: 'aria-relevant',
  BUSY: 'aria-busy',
} as const

// Screen reader announcement priorities
export const ANNOUNCEMENT_PRIORITY = {
  POLITE: 'polite',
  ASSERTIVE: 'assertive',
  OFF: 'off',
} as const

// Focus trap query selector for focusable elements
export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input[type="text"]:not([disabled])',
  'input[type="radio"]:not([disabled])',
  'input[type="checkbox"]:not([disabled])',
  'input[type="email"]:not([disabled])',
  'input[type="password"]:not([disabled])',
  'input[type="number"]:not([disabled])',
  'input[type="search"]:not([disabled])',
  'input[type="tel"]:not([disabled])',
  'input[type="url"]:not([disabled])',
  'input[type="date"]:not([disabled])',
  'input[type="datetime-local"]:not([disabled])',
  'input[type="month"]:not([disabled])',
  'input[type="week"]:not([disabled])',
  'input[type="time"]:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
  '[contenteditable="true"]',
].join(', ')

// Color contrast utilities
export const COLOR_CONTRAST = {
  NORMAL_AA: 4.5,
  NORMAL_AAA: 7,
  LARGE_AA: 3,
  LARGE_AAA: 4.5,
} as const

// Screen reader only class
export const SCREEN_READER_ONLY = 'sr-only' as const

// Common accessibility error messages
export const A11Y_MESSAGES = {
  MISSING_LABEL: 'Interactive element is missing an accessible label',
  LOW_CONTRAST: 'Text has insufficient color contrast',
  MISSING_ALT: 'Image is missing alternative text',
  KEYBOARD_TRAP: 'Keyboard focus is trapped',
  NO_SKIP_LINK: 'Page is missing skip navigation link',
  INVALID_HEADING_STRUCTURE: 'Heading levels skip or are out of order',
  MISSING_FOCUS_INDICATOR: 'Interactive element has no visible focus indicator',
  AUTOPLAY_MEDIA: 'Media plays automatically without user control',
} as const