import { devices, type PlaywrightTestConfig } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT_DIR = path.dirname(fileURLToPath(import.meta.url))
const TESTS_DIR = path.join(ROOT_DIR, 'tests')

export const smokeProjects = [
	{
		name: 'chromium',
		use: { ...devices['Desktop Chrome'] },
		testDir: TESTS_DIR,
		testIgnore: ['staging/**', 'production/**']
	},
	{
		name: 'public',
		use: { ...devices['Desktop Chrome'] },
		testDir: TESTS_DIR,
		testMatch: ['notification-system-public.spec.ts']
	},
	{
		name: 'mobile-chrome',
		use: { ...devices['Pixel 5'] },
		testDir: TESTS_DIR,
		testMatch: ['notification-system-public.spec.ts']
	}
]

export const stagingProject = {
	name: 'staging',
	use: { ...devices['Desktop Chrome'] },
	testDir: path.join(TESTS_DIR, 'staging'),
	testMatch: ['**/*.spec.ts']
}

export const productionProject = {
	name: 'prod',
	use: { ...devices['Desktop Chrome'] },
	testDir: path.join(TESTS_DIR, 'production'),
	testMatch: ['**/*.spec.ts']
}

export const baseConfig: PlaywrightTestConfig = {
	testDir: TESTS_DIR,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		headless: true,
		trace: 'on-first-retry',
		screenshot: 'only-on-failure',
		video: 'retain-on-failure'
	}
}
