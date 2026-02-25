import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		testTimeout: 30_000,
		setupFiles: ['./src/setup/env.ts'],
		maxConcurrency: 1,
		fileParallelism: false,
	},
})
