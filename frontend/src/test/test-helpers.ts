import { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AllTheProviders } from './test-utils'

// Custom render function with providers
export const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything from testing library for convenience
export * from '@testing-library/react'

// Re-export mock factories
export * from './mocks'

// Export custom render as 'render' for easy use
export { customRender as render }