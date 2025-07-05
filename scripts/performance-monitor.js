#!/usr/bin/env node

/**
 * Performance Monitoring Script
 * Run this to monitor your application's performance in production
 */

const fs = require('fs')
const path = require('path')

const PERFORMANCE_CONFIG = {
	memoryThreshold: 500, // MB
	loadTimeThreshold: 3000, // ms
	bundleSizeThreshold: 2000, // KB
	checkInterval: 30000 // 30 seconds
}

class PerformanceMonitor {
	constructor() {
		this.logFile = path.join(process.cwd(), 'performance.log')
	}

	log(message) {
		const timestamp = new Date().toISOString()
		const logEntry = `[${timestamp}] ${message}\n`

		console.log(logEntry.trim())
		fs.appendFileSync(this.logFile, logEntry)
	}

	analyzeBundle() {
		const distPath = path.join(process.cwd(), 'dist')

		if (!fs.existsSync(distPath)) {
			this.log('❌ No dist folder found. Run `npm run build` first.')
			return
		}

		const files = fs.readdirSync(distPath, { recursive: true })
		let totalSize = 0
		let jsSize = 0
		let cssSize = 0

		files.forEach(file => {
			if (typeof file === 'string') {
				const filePath = path.join(distPath, file)
				const stats = fs.statSync(filePath)

				if (stats.isFile()) {
					totalSize += stats.size

					if (file.endsWith('.js')) {
						jsSize += stats.size
					} else if (file.endsWith('.css')) {
						cssSize += stats.size
					}
				}
			}
		})

		const totalKB = Math.round(totalSize / 1024)
		const jsKB = Math.round(jsSize / 1024)
		const cssKB = Math.round(cssSize / 1024)

		this.log(`📦 Bundle Analysis:`)
		this.log(`   Total: ${totalKB}KB`)
		this.log(`   JavaScript: ${jsKB}KB`)
		this.log(`   CSS: ${cssKB}KB`)

		if (totalKB > PERFORMANCE_CONFIG.bundleSizeThreshold) {
			this.log(
				`⚠️  Bundle size exceeds threshold (${PERFORMANCE_CONFIG.bundleSizeThreshold}KB)`
			)
			this.log(
				`   Consider code splitting or removing unused dependencies`
			)
		} else {
			this.log(`✅ Bundle size is within acceptable limits`)
		}
	}

	generateOptimizationReport() {
		this.log('🔍 Performance Optimization Report:')

		// Check package.json for heavy dependencies
		const packagePath = path.join(process.cwd(), 'package.json')
		if (fs.existsSync(packagePath)) {
			const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
			const heavyDeps = [
				'moment',
				'lodash',
				'jquery',
				'angular',
				'vue',
				'webpack-dev-server',
				'babel-polyfill'
			]

			const foundHeavyDeps = []
			Object.keys(pkg.dependencies || {}).forEach(dep => {
				if (heavyDeps.some(heavy => dep.includes(heavy))) {
					foundHeavyDeps.push(dep)
				}
			})

			if (foundHeavyDeps.length > 0) {
				this.log(
					`⚠️  Heavy dependencies detected: ${foundHeavyDeps.join(', ')}`
				)
				this.log(`   Consider alternatives or tree-shaking`)
			}
		}

		// Check for common performance issues
		const srcPath = path.join(process.cwd(), 'src')
		if (fs.existsSync(srcPath)) {
			this.checkForPerformanceIssues(srcPath)
		}
	}

	checkForPerformanceIssues(dir) {
		const files = fs.readdirSync(dir, { recursive: true })
		const issues = []

		files.forEach(file => {
			if (
				typeof file === 'string' &&
				(file.endsWith('.tsx') || file.endsWith('.ts'))
			) {
				const filePath = path.join(dir, file)
				const content = fs.readFileSync(filePath, 'utf8')

				// Check for potential performance issues
				if (
					content.includes('useEffect(() => {') &&
					content.includes('setInterval')
				) {
					issues.push(
						`${file}: Potential memory leak with setInterval in useEffect`
					)
				}

				if (content.match(/useState\(\[\]\)/g)?.length > 5) {
					issues.push(
						`${file}: Many useState hooks detected (consider useReducer)`
					)
				}

				if (
					content.includes('JSON.parse') &&
					content.includes('localStorage')
				) {
					issues.push(
						`${file}: localStorage JSON parsing (consider optimization)`
					)
				}
			}
		})

		if (issues.length > 0) {
			this.log('⚠️  Potential performance issues found:')
			issues.forEach(issue => this.log(`   - ${issue}`))
		} else {
			this.log('✅ No obvious performance issues detected')
		}
	}

	generateRecommendations() {
		this.log('💡 Performance Recommendations:')
		this.log('   1. Enable gzip compression on your server')
		this.log('   2. Use React.memo() for expensive components')
		this.log('   3. Implement virtual scrolling for large lists')
		this.log('   4. Use React Query for caching API responses')
		this.log('   5. Lazy load images and components')
		this.log('   6. Monitor Core Web Vitals in production')
		this.log('   7. Use service workers for caching')
		this.log('   8. Optimize images (WebP format)')
	}

	run() {
		this.log('🚀 Starting Performance Analysis...')
		this.analyzeBundle()
		this.generateOptimizationReport()
		this.generateRecommendations()
		this.log('✅ Performance analysis complete!')
		this.log(`📄 Full report saved to: ${this.logFile}`)
	}
}

// Run the monitor
const monitor = new PerformanceMonitor()
monitor.run()
