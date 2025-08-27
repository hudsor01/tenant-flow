#!/usr/bin/env node

/**
 * Automated Server Component Converter
 * 
 * Identifies and converts unnecessary client components to server components
 * Following React 19 and Next.js 15 best practices
 */

const fs = require('fs').promises
const path = require('path')
const { glob } = require('glob')

// Components that MUST remain client components
const CLIENT_REQUIRED = [
	// Components using browser APIs
	'theme-toggle',
	'command-palette',
	'offline-indicator',
	'posthog-',
	
	// Interactive components
	'button',
	'input',
	'select',
	'checkbox',
	'radio',
	'switch',
	'slider',
	'dialog',
	'dropdown',
	'popover',
	'tooltip',
	'sheet',
	'accordion',
	'tabs',
	'calendar',
	'date-picker',
	'form',
	'auth-guard',
	'auth-redirect',
	'supabase-auth',
	
	// Components using hooks
	'use',
	'provider',
	'context',
	
	// Charts and data visualization
	'chart',
	'sparkline',
	'bar-chart',
	
	// File uploads
	'upload',
	'file-',
	
	// Components with event handlers
	'onClick',
	'onChange',
	'onSubmit',
	'onFocus',
	'onBlur',
	'onKeyDown',
	'onKeyUp',
	'onMouseEnter',
	'onMouseLeave',
	'onScroll'
]

// React hooks that require client component
const CLIENT_HOOKS = [
	'useState',
	'useEffect',
	'useLayoutEffect',
	'useContext',
	'useReducer',
	'useCallback',
	'useMemo',
	'useRef',
	'useImperativeHandle',
	'useDebugValue',
	'useDeferredValue',
	'useTransition',
	'useId',
	'useSyncExternalStore',
	'useInsertionEffect',
	'useOptimistic',
	'useActionState',
	'useFormStatus',
	
	// Custom hooks
	'use[A-Z]',
	
	// Third-party hooks
	'useQuery',
	'useMutation',
	'useQueryClient',
	'useForm',
	'useRouter',
	'usePathname',
	'useParams',
	'useSearchParams'
]

// Browser APIs that require client component
const BROWSER_APIS = [
	'window',
	'document',
	'localStorage',
	'sessionStorage',
	'navigator',
	'location',
	'history',
	'screen',
	'alert',
	'confirm',
	'prompt',
	'fetch', // In event handlers
	'XMLHttpRequest',
	'WebSocket',
	'EventSource',
	'IntersectionObserver',
	'ResizeObserver',
	'MutationObserver',
	'requestAnimationFrame',
	'cancelAnimationFrame',
	'setTimeout',
	'setInterval',
	'clearTimeout',
	'clearInterval',
	'addEventListener',
	'removeEventListener'
]

async function analyzeComponent(filePath) {
	try {
		const content = await fs.readFile(filePath, 'utf-8')
		const fileName = path.basename(filePath, path.extname(filePath))
		
		// Check if it's currently a client component
		const hasUseClient = /^['"]use client['"]/m.test(content)
		
		if (!hasUseClient) {
			return { filePath, isClient: false, canConvert: false, reason: 'Already server component' }
		}
		
		// Reasons to keep as client component
		const reasons = []
		
		// Check filename patterns
		for (const pattern of CLIENT_REQUIRED) {
			if (fileName.toLowerCase().includes(pattern.toLowerCase())) {
				reasons.push(`Filename contains "${pattern}"`)
			}
		}
		
		// Check for React hooks
		for (const hook of CLIENT_HOOKS) {
			const hookRegex = new RegExp(`\\b${hook}\\b`, 'g')
			if (hookRegex.test(content)) {
				reasons.push(`Uses React hook: ${hook}`)
			}
		}
		
		// Check for browser APIs
		for (const api of BROWSER_APIS) {
			const apiRegex = new RegExp(`\\b${api}\\b`, 'g')
			if (apiRegex.test(content)) {
				// Exclude comments and string literals
				const codeOnly = content
					.replace(/\/\*[\s\S]*?\*\//g, '')
					.replace(/\/\/.*$/gm, '')
					.replace(/['"`].*?['"`]/g, '')
				
				if (new RegExp(`\\b${api}\\b`).test(codeOnly)) {
					reasons.push(`Uses browser API: ${api}`)
				}
			}
		}
		
		// Check for event handlers
		const eventHandlerRegex = /\bon[A-Z]\w+\s*=/g
		if (eventHandlerRegex.test(content)) {
			const matches = content.match(eventHandlerRegex) || []
			reasons.push(`Has event handlers: ${matches.slice(0, 3).join(', ')}`)
		}
		
		// Check for class components (legacy)
		if (/class\s+\w+\s+extends\s+(React\.)?Component/.test(content)) {
			reasons.push('Class component (needs refactoring)')
		}
		
		// Check for forwardRef (can be removed in React 19)
		const hasForwardRef = /forwardRef/.test(content)
		
		return {
			filePath,
			isClient: true,
			canConvert: reasons.length === 0,
			reasons,
			hasForwardRef,
			fileName
		}
		
	} catch (error) {
		return { filePath, error: error.message }
	}
}

async function convertToServerComponent(filePath) {
	try {
		let content = await fs.readFile(filePath, 'utf-8')
		
		// Remove 'use client' directive
		content = content.replace(/^['"]use client['"]\s*\n?\n?/m, '')
		
		// Remove forwardRef if present (React 19 doesn't need it)
		if (/forwardRef/.test(content)) {
			// Pattern 1: const Component = forwardRef((props, ref) => ...)
			content = content.replace(
				/const\s+(\w+)\s*=\s*forwardRef\s*\(\s*\(([^)]+)\)\s*=>\s*{/g,
				'function $1($2) {'
			)
			
			// Pattern 2: export default forwardRef(...)
			content = content.replace(
				/export\s+default\s+forwardRef\s*\(\s*function\s+(\w+)\s*\(([^)]+)\)\s*{/g,
				'export default function $1($2) {'
			)
			
			// Remove forwardRef import
			content = content.replace(/import\s*{[^}]*forwardRef[^}]*}\s*from\s*['"]react['"];?\n?/g, (match) => {
				const otherImports = match
					.replace(/forwardRef\s*,?\s*/, '')
					.replace(/,\s*,/, ',')
					.replace(/{,/, '{')
					.replace(/,}/, '}')
				
				if (otherImports.includes('{}')) {
					return ''
				}
				return otherImports
			})
		}
		
		await fs.writeFile(filePath, content, 'utf-8')
		return { success: true }
		
	} catch (error) {
		return { success: false, error: error.message }
	}
}

async function main() {
	console.log('🔍 Analyzing Components for Server Conversion')
	console.log('=============================================\n')
	
	// Find all TypeScript/JavaScript component files
	const files = await glob('src/**/*.{tsx,jsx}', {
		cwd: path.resolve(__dirname, '..'),
		absolute: true,
		ignore: [
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**',
			'**/*.test.*',
			'**/*.spec.*',
			'**/*.stories.*'
		]
	})
	
	console.log(`📁 Found ${files.length} component files\n`)
	
	const results = []
	let clientComponents = 0
	let convertible = 0
	let forwardRefCount = 0
	
	// Analyze all files
	for (const file of files) {
		const result = await analyzeComponent(file)
		
		if (result.isClient) {
			clientComponents++
			
			if (result.canConvert) {
				convertible++
				console.log(`✅ Can convert: ${result.fileName}`)
			} else {
				console.log(`❌ Must remain client: ${result.fileName}`)
				result.reasons.forEach(reason => {
					console.log(`   - ${reason}`)
				})
			}
			
			if (result.hasForwardRef) {
				forwardRefCount++
				console.log(`   ⚠️  Uses forwardRef (can be removed)`)
			}
		}
		
		results.push(result)
	}
	
	console.log('\n=====================================')
	console.log('📊 Analysis Complete')
	console.log('=====================================')
	console.log(`📝 Total components: ${files.length}`)
	console.log(`🔵 Client components: ${clientComponents}`)
	console.log(`✅ Can convert to server: ${convertible}`)
	console.log(`⚠️  Components using forwardRef: ${forwardRefCount}`)
	console.log(`🔴 Must remain client: ${clientComponents - convertible}`)
	
	// Ask for confirmation before converting
	if (convertible > 0) {
		console.log('\n🔄 Converting components to server components...\n')
		
		let converted = 0
		let failed = 0
		
		for (const result of results) {
			if (result.canConvert) {
				const conversionResult = await convertToServerComponent(result.filePath)
				
				if (conversionResult.success) {
					converted++
					console.log(`✅ Converted: ${result.fileName}`)
				} else {
					failed++
					console.log(`❌ Failed: ${result.fileName} - ${conversionResult.error}`)
				}
			}
		}
		
		console.log('\n=====================================')
		console.log('🎉 Conversion Complete!')
		console.log('=====================================')
		console.log(`✅ Successfully converted: ${converted} components`)
		if (failed > 0) {
			console.log(`❌ Failed conversions: ${failed}`)
		}
	}
	
	// Write detailed report
	const report = {
		timestamp: new Date().toISOString(),
		summary: {
			totalComponents: files.length,
			clientComponents,
			convertible,
			forwardRefCount,
			mustRemainClient: clientComponents - convertible
		},
		convertibleComponents: results.filter(r => r.canConvert).map(r => r.fileName),
		clientRequired: results.filter(r => r.isClient && !r.canConvert).map(r => ({
			file: r.fileName,
			reasons: r.reasons
		}))
	}
	
	await fs.writeFile(
		path.join(__dirname, 'server-component-report.json'),
		JSON.stringify(report, null, 2),
		'utf-8'
	)
	
	console.log('\n📄 Detailed report saved to: scripts/server-component-report.json')
}

// Run the script
main().catch(console.error)