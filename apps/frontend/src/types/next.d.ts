// Next.js type declarations for compatibility
import '@testing-library/jest-dom'

// Define types that are compatible with Next.js 15
export interface Metadata {
  title?: string | { default?: string; template?: string }
  description?: string
  keywords?: string | string[]
  robots?: string | { index?: boolean; follow?: boolean; noarchive?: boolean; nosnippet?: boolean; noimageindex?: boolean; nocache?: boolean }
  openGraph?: {
    title?: string
    description?: string
    url?: string | URL
    siteName?: string
    locale?: string
    type?: string
    images?: Array<{
      url: string | URL
      width?: number
      height?: number
      alt?: string
    }>
  }
  twitter?: {
    card?: string
    site?: string
    creator?: string
    title?: string
    description?: string
    images?: string | string[]
  }
  alternates?: {
    canonical?: string | URL
    languages?: Record<string, string>
  }
  viewport?: {
    width?: string | number
    height?: string | number
    initialScale?: number
    minimumScale?: number
    maximumScale?: number
    userScalable?: boolean
  }
  themeColor?: string | { media: string; color: string }[]
  colorScheme?: 'normal' | 'light' | 'dark' | 'light dark' | 'dark light'
  creator?: string
  publisher?: string
  category?: string
  classification?: string
  other?: Record<string, string | number | Array<string | number>>
}

export type ResolvingMetadata = Metadata

export interface Viewport {
  width?: string | number
  height?: string | number
  initialScale?: number
  minimumScale?: number
  maximumScale?: number
  userScalable?: boolean
  viewportFit?: 'auto' | 'contain' | 'cover'
  themeColor?: string | { media: string; color: string }[]
  colorScheme?: 'normal' | 'light' | 'dark' | 'light dark' | 'dark light'
}

// MetadataRoute namespace with correct definitions
export namespace MetadataRoute {
  export interface Robots {
    rules: Array<{
      userAgent?: string | string[]
      allow?: string | string[]
      disallow?: string | string[]
      crawlDelay?: number
    }>
    sitemap?: string | string[]
    host?: string
  }

  export type Sitemap = Array<{
    url: string
    lastModified?: string | Date
    changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
    priority?: number
    alternates?: {
      languages?: { [lang: string]: string }
    }
  }>

  export interface Manifest {
    name?: string
    short_name?: string
    description?: string
    start_url?: string
    display?: 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser'
    background_color?: string
    theme_color?: string
    icons?: Array<{
      src: string
      sizes?: string
      type?: string
      purpose?: string
    }>
  }
}

export interface NextConfig {
  reactStrictMode?: boolean
  compress?: boolean
  poweredByHeader?: boolean
  trailingSlash?: boolean
  reactProductionProfiling?: boolean
  experimental?: {
    reactCompiler?: boolean
  }
  generateEtags?: boolean
  eslint?: {
    ignoreDuringBuilds?: boolean
  }
  typescript?: {
    ignoreBuildErrors?: boolean
  }
  images?: {
    remotePatterns?: Array<{
      protocol?: string
      hostname?: string
      port?: string
      pathname?: string
    }>
    formats?: string[]
    minimumCacheTTL?: number
    dangerouslyAllowSVG?: boolean
    contentSecurityPolicy?: string
    unoptimized?: boolean
  }
  headers?: () => Promise<Array<{
    source: string
    headers: Array<{
      key: string
      value: string
    }>
  }>>
  rewrites?: () => Promise<Array<{
    source: string
    destination: string
  }>>
  redirects?: () => Promise<Array<{
    source: string
    destination: string
    permanent: boolean
  }>>
  webpack?: (config: unknown, context: unknown) => unknown
  env?: Record<string, string>
  output?: string
}