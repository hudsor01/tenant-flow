import {
  defineConfig,
  presetUno,
  presetAttributify,
  presetIcons,
  presetTypography,
  transformerDirectives,
  transformerVariantGroup,
  transformerCompileClass
} from 'unocss'
import { presetRadix } from 'unocss-preset-radix'
import presetAnimations from 'unocss-preset-animations'
import { presetShadcn } from 'unocss-preset-shadcn'

export default defineConfig({
  // Content scanning for Next.js
  content: {
    filesystem: [
      './src/**/*.{tsx,ts,jsx,js}',
    ]
  },
  
  presets: [
    // Base utilities - UnoCSS default (replaces Wind4)
    presetUno({
      dark: 'class'
    }),
    
    // ShadCN UI components support 
    presetShadcn({
      color: 'blue',
      darkSelector: '.dark'
    }),
    
    // Radix UI color scales with semantic tokens
    presetRadix({
      palette: ['blue', 'gray', 'green', 'red', 'purple', 'orange', 'slate'],
      darkSelector: '.dark',
      lightSelector: ':root, .light',
      aliases: {
        primary: 'blue',
        base: 'gray',
        success: 'green',
        danger: 'red',
        warning: 'orange'
      }
    }) as any,
    
    // Attributify mode for cleaner HTML
    presetAttributify(),
    
    // Typography utilities
    presetTypography(),
    
    // Animations preset
    presetAnimations(),
    
    // Icons with Lucide support
    presetIcons({
      scale: 1.2,
      extraProperties: {
        'display': 'inline-block',
        'vertical-align': 'middle',
      },
      collections: {
        lucide: () => import('@iconify-json/lucide/icons.json').then(i => i.default),
      }
    }),
  ],
  
  // Transformers for better DX
  transformers: [
    transformerDirectives(), // @apply support
    transformerVariantGroup(), // Group variants like hover:(bg-blue text-white)
    transformerCompileClass(), // Compile long class strings
  ],
  
  // Essential shortcuts for semantic tokens
  shortcuts: {
    // Success
    'text-success': 'text-success-9',
    'bg-success': 'bg-success-9',
    'border-success': 'border-success-8',
    'ring-success': 'ring-success-8',
    'bg-success/10': 'bg-success-9/10',
    'bg-success/30': 'bg-success-9/30',
    // Warning
    'text-warning': 'text-warning-9',
    'bg-warning': 'bg-warning-9', 
    'border-warning': 'border-warning-8',
    'ring-warning': 'ring-warning-8',
    'bg-warning/10': 'bg-warning-9/10',
    'bg-warning/5': 'bg-warning-9/5',
  },
})
