import type { StorybookConfig } from '@storybook/nextjs';
import { join, dirname } from 'path';
const postcss = require('postcss');

function getAbsolutePath(value: string): any {
  return dirname(require.resolve(join(value, 'package.json')));
}

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@storybook/addon-onboarding'),
    getAbsolutePath('@storybook/addon-interactions'),
    getAbsolutePath('@storybook/addon-themes'),
    {
      name: getAbsolutePath('@storybook/addon-postcss'),
      options: {
        postcssLoaderOptions: {
          implementation: postcss,
          postcssOptions: {
            config: join(__dirname, '../postcss.config.cjs'),
          },
        },
      },
    },
    // Note: Coverage addon temporarily disabled due to Node.js compatibility issue
    // getAbsolutePath('@storybook/addon-coverage'),
  ],
  framework: {
    name: getAbsolutePath('@storybook/nextjs'),
    options: {},
  },
  staticDirs: ['../../frontend/public'],
  webpackFinal: async (config, { configType }) => {
    // Add path aliases for frontend imports and shared package
    config.resolve!.alias = {
      ...config.resolve!.alias,
      '@': join(__dirname, '../../frontend/src'),
      '@repo/shared': join(__dirname, '../../../packages/shared/src'),
      '@repo/shared/validation': join(__dirname, '../../../packages/shared/src/validation'),
    };

    // Resolve Node.js built-in modules for browser compatibility
    config.resolve!.fallback = {
      ...config.resolve!.fallback,
      'fs': false,
      'path': false,
      'os': false,
      'crypto': false,
      'stream': false,
      'http': false,
      'https': false,
      'zlib': false,
      'url': false,
      'buffer': false,
      'util': false,
      'assert': false,
      'events': false,
      'readline': false,
      'child_process': false,
      'net': false,
      'tls': false,
      'dns': false,
      'timers': false,
      'querystring': false,
    };

    // Mock server-side modules that cause Node.js import issues
    config.resolve!.alias = {
      ...config.resolve!.alias,
      // Mock PostHog server imports
      'posthog-node': false,
      // Mock server actions that use Node.js modules
      '@/lib/actions/auth-actions': join(__dirname, '../mocks/auth-actions.js'),
      '@/lib/analytics/posthog-server': join(__dirname, '../mocks/posthog-server.js'),
    };

    // Optimize lucide-react to prevent webpack from processing entire icon bundle
    config.optimization = config.optimization || {};
    config.optimization.splitChunks = {
      ...config.optimization.splitChunks,
      cacheGroups: {
        ...config.optimization.splitChunks?.cacheGroups,
        lucideReact: {
          name: 'lucide-react',
          test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
          chunks: 'all',
          priority: 30,
        },
      },
    };

    // Add resolve alias for lucide-react to optimize imports
    config.resolve!.alias = {
      ...config.resolve!.alias,
      // Use ES modules version for better tree shaking
      'lucide-react': require.resolve('lucide-react/dist/esm/lucide-react.js'),
    };

    return config;
  },
  typescript: {
    check: false,
    reactDocgen: 'react-docgen-typescript',
    reactDocgenTypescriptOptions: {
      shouldExtractLiteralValuesFromEnum: true,
      propFilter: (prop) => (prop.parent ? !/node_modules/.test(prop.parent.fileName) : true),
    },
  },
  features: {
    experimentalRSC: true,
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;