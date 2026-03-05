import { defineConfig } from 'vitest/config'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import type { PluginOption } from 'vite'

const loadEnvFile = (fileName: string) => {
	const path = resolve(__dirname, fileName)
	try {
		const raw = readFileSync(path, 'utf8')
		for (const line of raw.split('\n')) {
			const trimmed = line.trim()
			if (!trimmed || trimmed.startsWith('#')) continue
			const equalsIndex = trimmed.indexOf('=')
			if (equalsIndex === -1) continue
			const key = trimmed.slice(0, equalsIndex)
			const value = trimmed.slice(equalsIndex + 1)
			if (process.env[key] === undefined) {
				process.env[key] = value
			}
		}
	} catch {
		// Missing env file is acceptable; other mechanisms may provide values
	}
}

loadEnvFile('.env.test')

export default defineConfig({
	resolve: {
		alias: {
			recharts: resolve(__dirname, 'src/test/mocks/recharts.tsx'),
			'recharts/types/component/DefaultTooltipContent': resolve(
				__dirname,
				'src/test/mocks/recharts-tooltip.ts'
			)
		}
	},
	plugins: [tsconfigPaths(), react()],
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					environment: 'jsdom',
					pool: 'vmThreads',
					globals: true,
					setupFiles: ['./src/test/unit-setup.ts'],
					include: ['src/**/*.{test,spec}.{ts,tsx}'],
					exclude: [
						'node_modules',
						'dist',
						'.next',
						'out',
						'build',
						'coverage',
						'tests/**',
						'e2e/**',
						'src/**/*.component.test.tsx'
					],
					coverage: {
						provider: 'v8',
						reporter: ['text', 'json', 'html', 'lcov'],
						exclude: [
							'node_modules/',
							'src/test/',
							'**/*.d.ts',
							'**/*.config.{ts,js}',
							'**/generated/**',
							'**/__mocks__/**',
							'src/types/**',
							'tests/**'
						],
						thresholds: {
							lines: 80,
							functions: 80,
							branches: 80,
							statements: 80
						}
					},
					testTimeout: 10000,
					hookTimeout: 10000
				}
			},
			{
				extends: true,
				test: {
					name: 'component',
					environment: 'jsdom',
					pool: 'vmThreads',
					globals: true,
					setupFiles: ['./src/test/unit-setup.ts'],
					include: ['src/**/*.component.test.{ts,tsx}'],
					testTimeout: 10000,
					hookTimeout: 10000
				}
			},
			{
				test: {
					name: 'integration',
					environment: 'node',
					pool: 'forks',
					fileParallelism: false,
					globals: true,
					testTimeout: 30000,
					include: ['tests/integration/**/*.test.ts'],
					setupFiles: ['./tests/integration/setup/env-loader.ts']
				}
			}
		]
	}
})
