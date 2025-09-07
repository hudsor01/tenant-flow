import type { StorybookConfig } from '@storybook/nextjs-vite'
import { join, dirname } from 'path'

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string): string {
  return dirname(require.resolve(join(value, 'package.json')))
}

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../../frontend/src/**/*.stories.@(js|jsx|mjs|ts|tsx)'
  ],
  
  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-themes'),
    getAbsolutePath('@storybook/addon-console'),
    getAbsolutePath('msw-storybook-addon'),
    getAbsolutePath('storybook-addon-grid-overlay'),
  ],

  framework: {
    name: getAbsolutePath('@storybook/nextjs-vite'),
    options: {
      nextConfigPath: join(__dirname, '../../frontend/next.config.ts')
    },
  },

  staticDirs: ['../../frontend/public', '../public'],

  async viteFinal(config, { configType }) {
    const { mergeConfig } = await import('vite')
    
    // Add path aliases for frontend imports and shared package
    const customConfig = {
      resolve: {
        alias: {
          '@': join(__dirname, '../../frontend/src'),
          '@repo/shared': join(__dirname, '../../../packages/shared/src'),
          '@repo/shared/validation': join(__dirname, '../../../packages/shared/src/validation'),
          '@repo/shared/lib/supabase-client': join(__dirname, '../mocks/supabase-client.js'),
          // Stub missing optional dependency used by framer-motion
          '@emotion/is-prop-valid': join(__dirname, '../mocks/emotion-is-prop-valid.js'),
          // Mock server actions that use Node.js modules
          '@/lib/actions/auth-actions': join(__dirname, '../mocks/auth-actions.js'),
          '@/lib/analytics/posthog-server': join(__dirname, '../mocks/posthog-server.js'),
        },
      },
      
      // Environment variables for modules that read process.env on import
      define: {
        'process.env.NODE_ENV': JSON.stringify('development'),
        'process.env.SUPABASE_URL': JSON.stringify('https://mock-project.supabase.co'),
        'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify('https://mock-project.supabase.co'),
        'process.env.SUPABASE_ANON_KEY': JSON.stringify('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.mock-anon-key'),
        'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify('eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.mock-anon-key'),
        'process.env.NEXT_PUBLIC_POSTHOG_KEY': JSON.stringify('mock-posthog-key'),
        'process.env.NEXT_PUBLIC_POSTHOG_HOST': JSON.stringify('https://app.posthog.com'),
        'process.env.NEXT_PUBLIC_BACKEND_URL': JSON.stringify('http://localhost:4600'),
      },

      // CSS configuration for proper Tailwind v4 and global styles
      css: {
        postcss: {
          plugins: [
            require('@tailwindcss/postcss'),
            require('autoprefixer'),
          ],
        },
      },

      // Mock Node.js modules that don't exist in browser
      optimizeDeps: {
        exclude: ['posthog-node'],
        include: [
          '@tanstack/react-query',
          '@tanstack/react-table',
          'framer-motion',
          'lucide-react',
          'recharts',
        ],
      },
    }

    return mergeConfig(config, customConfig)
  },

  typescript: {
    check: false,
    reactDocgen: false,
  },

  docs: {
    autodocs: false,
    defaultName: 'Documentation',
  },

  features: {
    experimentalRSC: true,
    buildStoriesJson: true,
  },
}

export default config