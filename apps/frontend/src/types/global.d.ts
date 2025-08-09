/**
 * Frontend-specific global type declarations
 */

/**
 * Module declarations for assets
 */
declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

/**
 * Enhanced FormData support for React 19 actions
 */
declare global {
  interface FormData {
    getAll(name: string): FormDataEntryValue[];
  }
}

/**
 * Next.js specific type extensions  
 */
declare module 'next' {
  interface NextRequest {
    json(): Promise<unknown>;
  }
}