/// <reference types="vite/client" />

// Ensure CSS modules are recognized
declare module '*.css' {
  const content: never
  export default content
}

// Ensure router module is recognized
declare module '@/router' {
  export const Router: React.FC
}

// Ensure these imports work without issues
declare module '/src/index.css' {
  const content: never
  export default content
}

declare module '/src/router.tsx' {
  export const Router: React.FC
}