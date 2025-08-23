/**
 * Jest DOM Type Declarations
 * Ensures TypeScript recognizes Jest DOM matchers from @testing-library/jest-dom
 */

import '@testing-library/jest-dom'

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R
      toHaveAttribute(_attr: string, _value?: unknown): R
      toHaveClass(..._classNames: string[]): R
      toHaveStyle(_style: string | Record<string, unknown>): R
      toHaveTextContent(_text: string | RegExp | ((_content: string) => boolean)): R
      toBeVisible(): R
      toBeChecked(): R
      toBeDisabled(): R
      toBeEnabled(): R
      toBeEmpty(): R
      toBeRequired(): R
      toBeValid(): R
      toBeInvalid(): R
      toHaveValue(_value: string | string[] | number): R
      toHaveDisplayValue(_value: string | RegExp | (string | RegExp)[]): R
      toHaveFocus(): R
      toHaveFormValues(_expectedValues: Record<string, unknown>): R
      toHaveAccessibleDescription(_expectedDescription?: string | RegExp): R
      toHaveAccessibleName(_expectedName?: string | RegExp): R
    }
  }
}