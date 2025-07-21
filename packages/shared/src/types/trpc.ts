// TRPC-related types for shared use

// Re-export the AppRouter type that should be defined in the backend
// The actual type will be imported from backend's built types
// TODO: Import actual router types from backend when available
export interface AppRouter {
  auth: unknown
  properties: unknown
  tenants: unknown
  leases: unknown
  maintenance: unknown
  subscriptions: unknown
  users: unknown
}

export type RouterInputs = {
  [Key in keyof AppRouter]: AppRouter[Key] extends { _def: { _config: { $types: { input: infer Input } } } } ? Input : never
}

export type RouterOutputs = {
  [Key in keyof AppRouter]: AppRouter[Key] extends { _def: { _config: { $types: { output: infer Output } } } } ? Output : never
}