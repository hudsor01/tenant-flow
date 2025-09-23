/**
 * scripts/ci/verify-workflows.ts
 *
 * Simple workflow validator for TenantFlow CI stabilization plan.
 *
 * - Scans .github/workflows/*.yml
 * - Validates actions/checkout usage contains required keys
 * - Detects anonymous mapping entries inside `with:` blocks
 * - Detects bare CLI invocations (e.g., `tenant-flow`)
 *
 * Exit code: 0 = OK, 1 = problems found
 *
 * Designed to run under ts-node in CI: `ts-node scripts/ci/verify-workflows.ts`
 */

import { promises as fs } from 'fs'
import * as path from 'path'

export interface WorkflowDiagnosticsResult {
	ok: boolean
	nodeVersion: string
	gitRef: string | null
	hasTenantFlowCli: boolean
	problems: string[]
	scannedFiles: string[]
	err?: string
}

const WORKFLOWS_DIR = path.join(process.cwd(), '.github', 'workflows')
const REQUIRED_CHECKOUT_KEYS = [
	'fetch-depth',
	'fetch-tags',
	'submodules',
	'ref'
]

export class CIValidator {
	workflowsDir: string

	constructor(workflowsDir = WORKFLOWS_DIR) {
		this.workflowsDir = workflowsDir
	}

	async loadWorkflows(): Promise<string[]> {
		try {
			const entries = await fs.readdir(this.workflowsDir)
			return entries
				.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'))
				.map(f => path.join(this.workflowsDir, f))
		} catch (err) {
			return []
		}
	}

	async readFile(p: string): Promise<string> {
		return fs.readFile(p, 'utf8')
	}

	/**
	 * Validate checkout blocks in a workflow YAML content.
	 * Returns array of human-readable problems (empty = no problems).
	 */
	validateCheckoutBlocks(yaml: string, filename: string): string[] {
		const problems: string[] = []
		const checkoutRegex = /uses:\s*actions\/checkout@([^\n]+)/g
		let m: RegExpExecArray | null
		while ((m = checkoutRegex.exec(yaml))) {
			const idx = m.index
			// Try to capture the following `with:` block (indented mapping)
			// naive approach: find "with:" after the uses line and capture subsequent indented lines
			const rest = yaml.slice(idx)
			const withMatch = /with:\s*\n((?:[ \t]+[^\n]+\n)+)/m.exec(rest)
			if (!withMatch) {
				problems.push(
					`${filename}: actions/checkout@... found but missing \`with:\` mapping or it's not formatted as expected.`
				)
				continue
			}
			const withBlock = withMatch[1]
			// Extract keys present
			const keys = withBlock
				? (withBlock
						.split('\n')
						.map(l => l.trim())
						.filter(Boolean)
						.map(l => {
							const keyMatch = /^([^\s:]+)\s*:/m.exec(l)
							return keyMatch ? keyMatch[1] : null
						})
						.filter(Boolean) as string[])
				: []

			for (const required of REQUIRED_CHECKOUT_KEYS) {
				if (!keys.includes(required)) {
					problems.push(
						`${filename}: checkout 'with:' block missing required key '${required}'. Present keys: ${keys.join(', ')}`
					)
				}
			}

			// Detect anonymous conditional entries inside with block like:
			//   ${{ something }}
			const anonLine = withBlock
				.split('\n')
				.find(ln => ln.trim().startsWith('${{'))
			if (anonLine) {
				problems.push(
					`${filename}: anonymous GH conditional found inside 'with:' block: "${anonLine.trim()}". Use explicit keys (e.g. ref:) instead.`
				)
			}
		}
		return problems
	}

	findBareCliInvocations(yaml: string, filename: string): string[] {
		const problems: string[] = []
		// detect bare word tenant-flow (not part of a path or package)
		const cliRegex = /\btenant-flow\b/g
		if (cliRegex.test(yaml)) {
			problems.push(
				`${filename}: found bare CLI invocation 'tenant-flow' — prefer npm scripts or npx to ensure CI runs it.`
			)
		}
		return problems
	}

	async runDiagnostics(): Promise<WorkflowDiagnosticsResult> {
		const result: WorkflowDiagnosticsResult = {
			ok: true,
			nodeVersion: process.version,
			gitRef: null,
			hasTenantFlowCli: false,
			problems: [],
			scannedFiles: []
		}

		try {
			const files = await this.loadWorkflows()
			if (files.length === 0) {
				result.problems.push('No workflow files found under .github/workflows')
				result.ok = false
				return result
			}
			for (const f of files) {
				let content = ''
				try {
					content = await this.readFile(f)
				} catch (e) {
					result.problems.push(`Failed to read ${f}: ${(e as Error).message}`)
					continue
				}
				result.scannedFiles.push(f)
				// validate checkout blocks
				const cProblems = this.validateCheckoutBlocks(content, f)
				result.problems.push(...cProblems)
				// find bare CLI invocations
				const cliProblems = this.findBareCliInvocations(content, f)
				if (cliProblems.length > 0) {
					result.problems.push(...cliProblems)
					result.hasTenantFlowCli = true
				}
				// try to locate a git ref mention (best-effort)
				const refMatch = /\bref:\s*(.+)/.exec(content)
				if (refMatch && refMatch[1] && !result.gitRef) {
					result.gitRef = refMatch[1].trim()
				}
			}
		} catch (err) {
			result.err = (err as Error).message
			result.ok = false
			return result
		}

		if (result.problems.length > 0) {
			result.ok = false
		}
		// WorkflowDiagnosticsResult.ok === true only if no problems and hasTenantFlowCli === false and gitRef !== null per plan rules
		if (result.ok) {
			if (result.hasTenantFlowCli) {
				result.ok = false
				result.problems.push(
					'Workflow contains bare tenant-flow CLI usages; expected none.'
				)
			}
			if (!result.gitRef) {
				// Not fatal by itself, but per validation rules we prefer an explicit ref in checkout
				result.problems.push(
					'No explicit ref value detected in scanned workflows. Ensure `ref: ${{ github.head_ref || github.sha }}` is present where necessary.'
				)
				result.ok = false
			}
		}

		return result
	}
}

async function main() {
	const validator = new CIValidator()
	const res = await validator.runDiagnostics()
	// Pretty print summary
	console.log('--- verify-workflows diagnostics ---')
	console.log(`node: ${res.nodeVersion}`)
	console.log(`scanned: ${res.scannedFiles.length} workflow(s)`)
	if (res.gitRef) console.log(`detected git ref snippet: ${res.gitRef}`)
	if (res.problems.length === 0) {
		console.log('No problems detected.')
		process.exit(0)
	}
	console.error('Problems detected:')
	for (const p of res.problems) {
		console.error('- ' + p)
	}
	// Dump JSON for CI artifact consumption
	try {
		const outPath = path.join(
			process.cwd(),
			'test-results',
			'verify-workflows.json'
		)
		await fs.mkdir(path.dirname(outPath), { recursive: true })
		await fs.writeFile(outPath, JSON.stringify(res, null, 2), 'utf8')
		console.error(`Wrote diagnostics JSON to ${outPath}`)
	} catch (e) {
		// ignore write errors
	}
	process.exit(1)
}

// Check if this script is run directly
if (require.main === module) {
	main().catch(err => {
		console.error('verify-workflows failed:', (err as Error).message)
		process.exit(1)
	})
}
