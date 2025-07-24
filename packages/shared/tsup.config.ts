import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'constants/index': 'src/constants/index.ts',
    'validation/index': 'src/validation/index.ts',
    'utils/index': 'src/utils/index.ts',
    'types/properties': 'src/types/properties.ts',
    'types/billing': 'src/types/billing.ts',
    'types/errors': 'src/types/errors.ts',
  },
  format: ['esm', 'cjs'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: false,
  outDir: 'dist',
  target: 'es2022',
  skipNodeModulesBundle: true,
  treeshake: true,
  minify: false,
  bundle: true,
  external: ['@nestjs/common', '@trpc/server', 'zod'],
  esbuildOptions: (options, { format }) => {
    if (format === 'esm') {
      options.conditions = ['module']
      options.mainFields = ['module', 'main']
    }
    return options
  },
})