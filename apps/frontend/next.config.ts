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
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://tenantflow.app;
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
      // 🚀 EDGE OPTIMIZATION: Advanced static asset caching
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Vercel-CDN-Cache-Control',
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
          {
            key: 'CDN-Cache-Control', 
            value: 'public, max-age=31536000, immutable',
          },
          {
            key: 'Vercel-CDN-Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // 🎯 PERFORMANCE: API routes caching
      {
        source: '/api/health',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=60, s-maxage=120',
          },
        ],
      },
      {
        source: '/api/analytics/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      // 🔄 ISR: Dashboard pages with stale-while-revalidate
      {
        source: '/(dashboard|properties|tenants|maintenance)/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, s-maxage=600, stale-while-revalidate=1200',
          },
        ],
      },
      // 📄 Static marketing pages
      {
        source: '/(|pricing|privacy-policy|terms-of-service)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=7200',
          },
          {
            key: 'CDN-Cache-Control',
            value: 'public, max-age=7200, s-maxage=14400',
          },
        ],
      },
      // 🖼️ Image optimization
      {
        source: '/(icon-|favicon|manifest)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, immutable',
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

  // Advanced Webpack configuration for performance optimization
  webpack: (config: Configuration, { isServer, dev }: WebpackConfigContext) => {
    // Suppress critical dependency warning from Supabase websocket-factory
    if (!config.ignoreWarnings) {
      config.ignoreWarnings = [];
    }
    config.ignoreWarnings.push(
      {
        module: /websocket-factory/,
        message: /Critical dependency/,
      },
      {
        module: /@supabase/,
        message: /Critical dependency/,
      },
    );
    
    if (!isServer) {
      // 🚀 PERFORMANCE: Advanced client-side optimizations
      if (!config.resolve) {
        config.resolve = {};
      }
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
      };

      // 🎯 CRITICAL: Optimize chunk splitting for better caching
      if (!dev && config.optimization) {
        config.optimization.splitChunks = {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000, // ~240KB chunks
          cacheGroups: {
            // Keep React in main bundle (prevents React.Children errors)
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 20,
              enforce: true,
            },
            // Core UI libraries
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix-ui',
              chunks: 'all',
              priority: 15,
              enforce: true,
            },
            // Charts and visualization (lazy load)
            charts: {
              test: /[\\/]node_modules[\\/](recharts|framer-motion)[\\/]/,
              name: 'charts',
              chunks: 'async',
              priority: 10,
            },
            // PDF and heavy libraries (lazy load)
            heavy: {
              test: /[\\/]node_modules[\\/](jspdf|html2canvas|docx|jszip)[\\/]/,
              name: 'heavy-libs',
              chunks: 'async',
              priority: 10,
            },
            // Form libraries
            forms: {
              test: /[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/,
              name: 'forms',
              chunks: 'all',
              priority: 12,
            },
            // State management
            state: {
              test: /[\\/]node_modules[\\/](jotai|@tanstack)[\\/]/,
              name: 'state-management',
              chunks: 'all',
              priority: 12,
            },
            // Utilities (can be shared)
            utils: {
              test: /[\\/]node_modules[\\/](date-fns|clsx|class-variance-authority)[\\/]/,
              name: 'utils',
              chunks: 'all',
              priority: 8,
            },
            // Everything else (vendor)
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              chunks: 'all',
              priority: 5,
              minChunks: 2,
            },
          },
        };

        // 🔥 PERFORMANCE: Module concatenation for smaller bundles
        config.optimization.concatenateModules = true;
        
        // 🔥 PERFORMANCE: Tree shaking optimization
        config.optimization.usedExports = true;
        config.optimization.sideEffects = false;
      }
    }
    
    // Add SVG support with optimization
    if (!config.module) {
      config.module = { rules: [] };
    }
    if (!config.module.rules) {
      config.module.rules = [];
    }
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: '@svgr/webpack',
          options: {
            svgo: true,
            svgoConfig: {
              plugins: [
                {
                  name: 'removeViewBox',
                  active: false,
                },
                {
                  name: 'removeDimensions',
                  active: true,
                },
              ],
            },
          },
        },
      ],
    });

    // 📊 ANALYTICS: Bundle analyzer in production builds
    if (!dev && process.env.ANALYZE === 'true') {
      const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
      if (!config.plugins) config.plugins = [];
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: '../analyze/client.html',
        })
      );
    }

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