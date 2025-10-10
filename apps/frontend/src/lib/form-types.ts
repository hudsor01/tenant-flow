/**
 * Minimal shape used by field render-props across the frontend.
 * Keep this intentionally small to avoid coupling to internal library types
 * while still providing a canonical, reusable type to replace ad-hoc casts.
 */
export type FormFieldApi<TValue = unknown> = {
  state: {
    value: TValue
    meta: {
      errors?: unknown[]
    }
  }
  handleChange: (value: TValue | ((prev: TValue) => TValue)) => void
  handleBlur: () => void
}

export default {} as unknown
