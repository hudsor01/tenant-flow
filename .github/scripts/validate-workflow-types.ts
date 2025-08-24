#!/usr/bin/env tsx
/**
 * GitHub Actions Workflow Type Validation Script
 * Ensures type safety for CI/CD configuration and environment variables
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, extname } from 'path'
import { parse as parseYaml } from 'yaml'

// ========================
// GitHub Actions Types
// ========================

interface GitHubWorkflow {
	name: string
	on: WorkflowTriggers
	env?: Record<string, string>
	concurrency?: {
		group: string
		'cancel-in-progress'?: boolean
	}
	jobs: Record<string, Job>
}

interface WorkflowTriggers {
	push?: {
		branches?: string[]
		paths?: string[]
		'paths-ignore'?: string[]
	}
	pull_request?: {
		types?: string[]
		branches?: string[]
		paths?: string[]
		'paths-ignore'?: string[]
	}
	workflow_dispatch?: {
		inputs?: Record<string, WorkflowInput>
	}
	schedule?: Array<{
		cron: string
	}>
}

interface WorkflowInput {
	description: string
	required?: boolean
	default?: string
	type?: 'boolean' | 'choice' | 'environment' | 'number' | 'string'
	options?: string[]
}

interface Job {
	name?: string
	'runs-on': string | string[]
	'timeout-minutes'?: number
	needs?: string | string[]
	if?: string
	strategy?: {
		matrix?: Record<string, unknown>
		'fail-fast'?: boolean
		'max-parallel'?: number
	}
	environment?: string | {
		name: string
		url?: string
	}
	concurrency?: {
		group: string
		'cancel-in-progress'?: boolean
	}
	outputs?: Record<string, string>
	env?: Record<string, string>
	defaults?: {
		run?: {
			shell?: string
			'working-directory'?: string
		}
	}
	steps: Step[]
}

interface Step {
	id?: string
	name?: string
	uses?: string
	run?: string
	with?: Record<string, unknown>
	env?: Record<string, string>
	if?: string
	'continue-on-error'?: boolean
	'timeout-minutes'?: number
	shell?: string
	'working-directory'?: string
}

// ========================
// Validation Rules
// ========================

interface ValidationRule {
	name: string
	validate: (workflow: GitHubWorkflow, filename: string) => ValidationResult[]
}

interface ValidationResult {
	type: 'error' | 'warning' | 'info'
	message: string
	location?: string
}

// ========================
// Validation Implementation
// ========================

const validationRules: ValidationRule[] = [
	{
		name: 'Required Fields',
		validate: (workflow, filename) => {
			const results: ValidationResult[] = []

			if (!workflow.name) {
				results.push({
					type: 'error',
					message: 'Workflow must have a name',
					location: filename
				})
			}

			if (!workflow.on) {
				results.push({
					type: 'error',
					message: 'Workflow must define triggers',
					location: filename
				})
			}

			if (!workflow.jobs || Object.keys(workflow.jobs).length === 0) {
				results.push({
					type: 'error',
					message: 'Workflow must define at least one job',
					location: filename
				})
			}

			return results
		}
	},

	{
		name: 'Environment Variables',
		validate: (workflow, filename) => {
			const results: ValidationResult[] = []
			const requiredEnvVars = ['NODE_VERSION', 'TURBO_TOKEN', 'TURBO_TEAM']
			const recommendedEnvVars = ['CI']

			// Check global env
			if (workflow.env) {
				for (const required of requiredEnvVars) {
					if (!(required in workflow.env)) {
						results.push({
							type: 'warning',
							message: `Missing recommended environment variable: ${required}`,
							location: `${filename} (global env)`
						})
					}
				}
			}

			// Check job-level env
			for (const [jobName, job] of Object.entries(workflow.jobs)) {
				if (job.env) {
					// Validate timeout settings
					if (job['timeout-minutes'] && job['timeout-minutes'] > 60) {
						results.push({
							type: 'warning',
							message: `Job timeout (${job['timeout-minutes']} minutes) is quite high`,
							location: `${filename} (job: ${jobName})`
						})
					}
				}
			}

			return results
		}
	},

	{
		name: 'Job Configuration',
		validate: (workflow, filename) => {
			const results: ValidationResult[] = []

			for (const [jobName, job] of Object.entries(workflow.jobs)) {
				// Check runner configuration
				if (typeof job['runs-on'] === 'string') {
					if (!['ubuntu-latest', 'windows-latest', 'macos-latest'].includes(job['runs-on'])) {
						results.push({
							type: 'warning',
							message: `Consider using -latest runners for better maintenance: ${job['runs-on']}`,
							location: `${filename} (job: ${jobName})`
						})
					}
				}

				// Check for timeout
				if (!job['timeout-minutes']) {
					results.push({
						type: 'warning',
						message: 'Job should have a timeout-minutes set to prevent hanging',
						location: `${filename} (job: ${jobName})`
					})
				}

				// Check step configuration
				for (let i = 0; i < job.steps.length; i++) {
					const step = job.steps[i]
					
					// Check for action versions
					if (step.uses && !step.uses.includes('@')) {
						results.push({
							type: 'error',
							message: `Action should specify a version: ${step.uses}`,
							location: `${filename} (job: ${jobName}, step: ${i + 1})`
						})
					}

					// Check for dangerous patterns
					if (step.run && step.run.includes('curl') && !step.run.includes('-f')) {
						results.push({
							type: 'warning',
							message: 'curl commands should use -f flag to fail on HTTP errors',
							location: `${filename} (job: ${jobName}, step: ${i + 1})`
						})
					}

					// Check for secrets exposure
					if (step.run && /\$\{\{\s*secrets\./i.test(step.run)) {
						results.push({
							type: 'warning',
							message: 'Avoid using secrets directly in run commands, use env instead',
							location: `${filename} (job: ${jobName}, step: ${i + 1})`
						})
					}
				}
			}

			return results
		}
	},

	{
		name: 'Security Best Practices',
		validate: (workflow, filename) => {
			const results: ValidationResult[] = []

			// Check for hardcoded secrets
			const workflowContent = JSON.stringify(workflow)
			if (/password|secret|token|key/i.test(workflowContent) && !/secrets\./i.test(workflowContent)) {
				results.push({
					type: 'warning',
					message: 'Potential hardcoded credentials detected',
					location: filename
				})
			}

			// Check for checkout action security
			for (const [jobName, job] of Object.entries(workflow.jobs)) {
				for (let i = 0; i < job.steps.length; i++) {
					const step = job.steps[i]
					
					if (step.uses.startsWith('actions/checkout')) {
						if (!step.with.['fetch-depth']) {
							results.push({
								type: 'info',
								message: 'Consider setting fetch-depth for checkout action for performance',
								location: `${filename} (job: ${jobName}, step: ${i + 1})`
							})
						}
					}

					// Check for setup-node
					if (step.uses.startsWith('actions/setup-node')) {
						if (!step.with.['node-version']) {
							results.push({
								type: 'warning',
								message: 'setup-node should specify node-version',
								location: `${filename} (job: ${jobName}, step: ${i + 1})`
							})
						}
					}
				}
			}

			return results
		}
	},

	{
		name: 'Performance Optimization',
		validate: (workflow, filename) => {
			const results: ValidationResult[] = []

			for (const [jobName, job] of Object.entries(workflow.jobs)) {
				let hasCaching = false
				let hasParallelSteps = false

				for (const step of job.steps) {
					// Check for caching
					if (step.uses.includes('cache')) {
						hasCaching = true
					}

					// Check for npm ci vs npm install
					if (step.run.includes('npm install') && !step.run.includes('npm ci')) {
						results.push({
							type: 'warning',
							message: 'Consider using "npm ci" instead of "npm install" for faster, deterministic builds',
							location: `${filename} (job: ${jobName})`
						})
					}
				}

				// Recommend caching for long-running jobs
				if (!hasCaching && job.steps.length > 3) {
					results.push({
						type: 'info',
						message: 'Consider adding caching for better performance',
						location: `${filename} (job: ${jobName})`
					})
				}

				// Check for matrix strategy
				if (job.strategy.matrix && !job.strategy['fail-fast']) {
					results.push({
						type: 'info',
						message: 'Consider setting fail-fast: false for matrix jobs to see all failures',
						location: `${filename} (job: ${jobName})`
					})
				}
			}

			return results
		}
	}
]

// ========================
// Main Validation Function
// ========================

function validateWorkflow(filePath: string): ValidationResult[] {
	try {
		const content = readFileSync(filePath, 'utf-8')
		const workflow = parseYaml(content) as GitHubWorkflow
		const filename = filePath.split('/').pop() || filePath

		const results: ValidationResult[] = []

		for (const rule of validationRules) {
			try {
				const ruleResults = rule.validate(workflow, filename)
				results.push(...ruleResults)
			} catch (error) {
				results.push({
					type: 'error',
					message: `Validation rule "${rule.name}" failed: ${error}`,
					location: filename
				})
			}
		}

		return results
	} catch (error) {
		return [{
			type: 'error',
			message: `Failed to parse workflow file: ${error}`,
			location: filePath
		}]
	}
}

// ========================
// File Discovery
// ========================

function findWorkflowFiles(dir: string): string[] {
	const files: string[] = []
	
	try {
		const entries = readdirSync(dir)
		
		for (const entry of entries) {
			const fullPath = join(dir, entry)
			const stat = statSync(fullPath)
			
			if (stat.isDirectory()) {
				files.push(...findWorkflowFiles(fullPath))
			} else if (stat.isFile() && ['.yml', '.yaml'].includes(extname(entry))) {
				files.push(fullPath)
			}
		}
	} catch (error) {
		console.warn(`Warning: Could not read directory ${dir}: ${error}`)
	}
	
	return files
}

// ========================
// Main Execution
// ========================

function main() {
	console.log('🔍 Validating GitHub Actions workflows...\n')

	const workflowsDir = join(process.cwd(), '.github', 'workflows')
	const workflowFiles = findWorkflowFiles(workflowsDir)

	if (workflowFiles.length === 0) {
		console.log('No workflow files found in .github/workflows/')
		return
	}

	let totalErrors = 0
	let totalWarnings = 0
	let totalInfo = 0

	for (const file of workflowFiles) {
		console.log(`\n📄 Validating ${file.replace(process.cwd(), '.')}`)
		
		const results = validateWorkflow(file)
		
		if (results.length === 0) {
			console.log('  ✅ No issues found')
			continue
		}

		for (const result of results) {
			const icon = result.type === 'error' ? '❌' : result.type === 'warning' ? '⚠️' : 'ℹ️'
			console.log(`  ${icon} ${result.message}`)
			if (result.location) {
				console.log(`      Location: ${result.location}`)
			}

			switch (result.type) {
				case 'error': totalErrors++; break
				case 'warning': totalWarnings++; break
				case 'info': totalInfo++; break
			}
		}
	}

	// Summary
	console.log('\n📊 Validation Summary:')
	console.log(`  Errors: ${totalErrors}`)
	console.log(`  Warnings: ${totalWarnings}`)
	console.log(`  Info: ${totalInfo}`)
	console.log(`  Files checked: ${workflowFiles.length}`)

	if (totalErrors > 0) {
		console.log('\n❌ Validation failed due to errors')
		process.exit(1)
	} else if (totalWarnings > 0) {
		console.log('\n⚠️ Validation passed with warnings')
	} else {
		console.log('\n✅ All workflows are valid!')
	}
}

// ========================
// Type Exports for Reuse
// ========================

export type {
	GitHubWorkflow,
	WorkflowTriggers,
	Job,
	Step,
	ValidationResult,
	ValidationRule
}

export {
	validateWorkflow,
	findWorkflowFiles,
	validationRules
}

// Run if called directly
if (require.main === module) {
	main()
}