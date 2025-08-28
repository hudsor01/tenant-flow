/**
 * scripts/ci/ci-types.ts
 *
 * Shared TypeScript types used by CI helper scripts.
 */

export interface CiCheckoutConfig {
	fetchDepth: number
	fetchTags: boolean
	submodules: boolean
	ref: string
}

export interface WorkflowDiagnosticsResult {
	ok: boolean
	nodeVersion: string
	gitRef: string | null
	hasTenantFlowCli: boolean
	problems: string[]
	scannedFiles: string[]
	err?: string
}

export enum NodeStrategy {
	PIN_18 = 'pin-18',
	UPGRADE_24 = 'upgrade-24'
}
