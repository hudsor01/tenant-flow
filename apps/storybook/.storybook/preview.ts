import type { Preview } from '@storybook/react';
import '../../frontend/src/app/global.css';

// Mock Node.js globals and process for browser compatibility
if (typeof window !== 'undefined') {
  // Mock process.env for browser
  (window as any).process = {
    env: {
      NODE_ENV: 'development',
      NEXT_PUBLIC_SUPABASE_URL: 'mock-supabase-url',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'mock-anon-key',
      NEXT_PUBLIC_POSTHOG_KEY: 'mock-posthog-key',
      NEXT_PUBLIC_POSTHOG_HOST: 'https://app.posthog.com',
    }
  };

  // Mock global for browser
  (window as any).global = window;
}

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff',
        },
        {
          name: 'dark',
          value: '#0f172a',
        },
      ],
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'paintbrush',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
};

export default preview;