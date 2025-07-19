// TRPC-related types for shared use

// Re-export the AppRouter type that should be defined in the backend
// The actual type will be imported from backend's built types
export type AppRouter = any

// For now, use any types until we can properly import from backend
export type RouterInputs = any
export type RouterOutputs = any