import type { NextConfig } from 'next'
import type { Configuration } from 'webpack'
import type webpack from 'webpack'

interface WebpackConfigContext {
  buildId: string;
  dev: boolean;
  isServer: boolean;
  defaultLoaders: {
    babel: object;
  };
  webpack: typeof webpack;
}

const nextConfig: NextConfig = {
  // Core optimizations
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  trailingSlash: false,
  
  // Performance optimizations
  generateEtags: true,
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{ member }}'
    }
  },
  
  // Image optimizations for Vercel
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      }
    ],
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    unoptimized: false,
  },
  
  // Experimental features (stable only)
  experimental: {
    // Package optimizations
    optimizePackageImports: [
      'lucide-react',
      'react-icons',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-toast',
      'framer-motion',
      'recharts',
    ],
    // Disable canary-only features
    // ppr: false, // Removed - canary only
    // after: false, // Removed - canary only
    reactCompiler: false, // Disable for stability
  },

  // Security headers
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Content Security Policy (only in production)
    const ContentSecurityPolicy = `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://tenantflow.app https://js.stripe.com https://va.vercel-scripts.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      font-src 'self' https://fonts.gstatic.com data:;
      img-src 'self' data: https: blob:;
      connect-src 'self' https://api.tenantflow.app https://*.supabase.co https://vitals.vercel-insights.com wss://*.supabase.co https://api.stripe.com;
      frame-src 'self' https://js.stripe.com https://hooks.stripe.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim();

    const headers = [
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-XSS-Protection',
        value: '1; mode=block',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
    ];

    // Only add CSP in production to avoid conflicts with middleware
    if (!isDevelopment) {
      headers.unshift({
        key: 'Content-Security-Policy',
        value: ContentSecurityPolicy,
      });
    }

    return [
      {
        source: '/:path*',
        headers,
      },
      // Cache static assets
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/signin',
        destination: '/auth/login',
        permanent: true,
      },
      {
        source: '/login',
        destination: '/auth/login',
        permanent: true,
      },
      {
        source: '/signup',
        destination: '/auth/signup',
        permanent: false,
      },
      {
        source: '/register',
        destination: '/auth/signup',
        permanent: false,
      },
    ];
  },

  // Webpack configuration
  webpack: (config: Configuration, { isServer }: WebpackConfigContext) => {
    // Suppress critical dependency warning from Supabase websocket-factory
    if (!config.ignoreWarnings) {
      config.ignoreWarnings = [];
    }
    config.ignoreWarnings.push({
      module: /websocket-factory/,
      message: /Critical dependency/,
    });
    
    if (!isServer) {
      // Client-side optimizations
      if (!config.resolve) {
        config.resolve = {};
      }
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Add SVG support
    if (!config.module) {
      config.module = { rules: [] };
    }
    if (!config.module.rules) {
      config.module.rules = [];
    }
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },

  // Environment variables to expose to the browser
  env: {
    NEXT_PUBLIC_APP_NAME: 'TenantFlow',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },

  // Output configuration
  output: 'standalone',
  
  // TypeScript and ESLint
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: './tsconfig.json',
  },
  eslint: {
    ignoreDuringBuilds: false,
    dirs: ['src', 'pages', 'components', 'lib', 'utils'],
  },
};

export default nextConfig;