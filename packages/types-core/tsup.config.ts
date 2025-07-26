import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: {
    only: false,
    resolve: true,
    // Ensure all exports are included
    compilerOptions: {
      preserveConstEnums: true
    }
  },
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  external: [],
  // Ensure all exports are bundled
  noExternal: [],
  treeshake: false
})