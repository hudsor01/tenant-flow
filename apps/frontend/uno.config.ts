import {
  defineConfig,
  presetIcons,
  transformerDirectives,
  transformerVariantGroup
} from 'unocss'
import presetWind4 from '@unocss/preset-wind4'
import { presetShadcn } from 'unocss-preset-shadcn'

export default defineConfig({
  // Content scanning for Next.js
  content: {
    filesystem: [
      './src/**/*.{tsx,ts,jsx,js}',
    ]
  },
  
  // Disable web fonts globally to prevent timeout in Vercel builds
  safelist: [],
  
  presets: [
    // Tailwind 4 utilities (your choice - following user preference)
    presetWind4({
      dark: 'class'
    }),
    
    // ShadCN for UI components (includes Radix colors, avoiding separate presetRadix)
    presetShadcn({
      color: 'blue',
      darkSelector: '.dark'
    }),
    
    // Icons only - load from local packages
    // Note: Fonts are handled by Next.js next/font/google in layout.tsx
    presetIcons({
      collections: {
        lucide: () => import('@iconify-json/lucide/icons.json').then(i => i.default),
      },
      // Don't use CDN - load icons from local packages only
      autoInstall: false
    }),
  ],
  
  // Essential transformers only
  transformers: [
    transformerDirectives(), // @apply support
    transformerVariantGroup(), // Group variants like hover:(bg-blue text-white)
  ],
})
