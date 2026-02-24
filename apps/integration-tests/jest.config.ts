import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  setupFiles: ['./src/setup/env.ts'],
  testTimeout: 30000, // 30 seconds — Supabase calls can be slow
  verbose: true,
  forceExit: true,
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        useESM: false,
        tsconfig: {
          module: 'commonjs',
          target: 'es2022',
          moduleResolution: 'node',
          allowSyntheticDefaultImports: true,
          esModuleInterop: true,
          skipLibCheck: true,
          strict: true,
          isolatedModules: true,
        },
      },
    ],
  },
}

export default config
