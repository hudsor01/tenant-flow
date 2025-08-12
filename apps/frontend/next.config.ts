import type { NextConfig } from './src/types/next'
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
  
  // Production profiling
  reactProductionProfiling: false,
  experimental: {
    reactCompiler: false,
  },
  
  // Performance optimizations
  generateEtags: true,
  eslint: {
    ignoreDuringBuilds: true, // Ignore ESLint during builds
  },
  typescript: {
    ignoreBuildErrors: true, // Ignore TypeScript errors during builds for production
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

  // Cache and performance headers only (security handled by middleware)
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';

    return [
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

  // Rewrites for PostHog reverse proxy (prevents ad blockers)
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://us.i.posthog.com/:path*',
      },
      {
        source: '/ingest/decide',
        destination: 'https://us.i.posthog.com/decide',
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
  // Note: These optimizations only apply when using webpack (production builds)
  // Development uses Turbopack which handles optimizations differently
  webpack: (config: unknown, context: unknown) => {
    const webpackConfig = config as Configuration
    const { isServer, dev, webpack } = context as WebpackConfigContext
    // 🛡️ PRODUCTION SECURITY: Exclude test files and debug code from production bundles
    if (!dev) {
      if (!webpackConfig.module) {
        webpackConfig.module = { rules: [] };
      }
      if (!webpackConfig.module.rules) {
        webpackConfig.module.rules = [];
      }
      
      // Exclude test files from production bundles
      webpackConfig.module.rules.push({
        test: /\.(test|spec)\.(ts|tsx|js|jsx)$/,
        loader: 'ignore-loader'
      });
      
      // Exclude test directories from production bundles
      webpackConfig.module.rules.push({
        test: /(__tests__|__mocks__|tests)\//,
        loader: 'ignore-loader'
      });
      
      // Note: We keep debug-auth.ts in production as it checks NODE_ENV internally
      // This prevents runtime errors when the module is imported
    }
    // Suppress critical dependency warning from Supabase websocket-factory
    if (!webpackConfig.ignoreWarnings) {
      webpackConfig.ignoreWarnings = [];
    }
    webpackConfig.ignoreWarnings.push(
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
      if (!webpackConfig.resolve) {
        webpackConfig.resolve = {};
      }
      webpackConfig.resolve.fallback = {
        ...webpackConfig.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        buffer: false,
        util: false,
      };

      // 🎯 CRITICAL: Optimize chunk splitting for better caching
      if (!dev && webpackConfig.optimization) {
        webpackConfig.optimization.splitChunks = {
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
        webpackConfig.optimization.concatenateModules = true;
        
        // 🔥 PERFORMANCE: Tree shaking optimization
        webpackConfig.optimization.usedExports = true;
        webpackConfig.optimization.sideEffects = false;
      }
    }
    
    // Add SVG support with optimization
    if (!webpackConfig.module) {
      webpackConfig.module = { rules: [] };
    }
    if (!webpackConfig.module.rules) {
      webpackConfig.module.rules = [];
    }
    webpackConfig.module.rules.push({
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
      if (!webpackConfig.plugins) webpackConfig.plugins = [];
      webpackConfig.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          reportFilename: '../analyze/client.html',
        })
      );
    }

    return webpackConfig;
  },

  // Environment variables to expose to the browser
  env: {
    NEXT_PUBLIC_APP_NAME: 'TenantFlow',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  },

  // Output configuration - removed 'standalone' for Vercel compatibility
  // Note: 'standalone' output is for Docker/self-hosting, not Vercel
  
  // Final TypeScript and ESLint overrides for production
  // (Earlier config takes precedence with ignoreBuildErrors: true)
};

export default nextConfig;