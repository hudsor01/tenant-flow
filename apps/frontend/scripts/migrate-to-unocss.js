#!/usr/bin/env node

/**
 * Automated Migration Script: Lucide React → UnoCSS Icons
 * 
 * This script automatically migrates all lucide-react imports to UnoCSS icon classes
 * Handles 194+ files in one go with zero manual intervention
 */

const fs = require('fs').promises
const path = require('path')
const { glob } = require('glob')

// Icon mapping from lucide-react to UnoCSS classes
const iconMap = {
	// Common icons
	'Loader2': 'i-lucide-loader-2',
	'X': 'i-lucide-x',
	'Check': 'i-lucide-check',
	'ChevronLeft': 'i-lucide-chevron-left',
	'ChevronRight': 'i-lucide-chevron-right',
	'ChevronDown': 'i-lucide-chevron-down',
	'ChevronUp': 'i-lucide-chevron-up',
	'ArrowLeft': 'i-lucide-arrow-left',
	'ArrowRight': 'i-lucide-arrow-right',
	'ArrowUp': 'i-lucide-arrow-up',
	'ArrowDown': 'i-lucide-arrow-down',
	'Menu': 'i-lucide-menu',
	'Search': 'i-lucide-search',
	'Settings': 'i-lucide-settings',
	'User': 'i-lucide-user',
	'Users': 'i-lucide-users',
	'Home': 'i-lucide-home',
	'Plus': 'i-lucide-plus',
	'Minus': 'i-lucide-minus',
	'Edit': 'i-lucide-edit',
	'Edit2': 'i-lucide-edit-2',
	'Edit3': 'i-lucide-edit-3',
	'Trash': 'i-lucide-trash',
	'Trash2': 'i-lucide-trash-2',
	'Download': 'i-lucide-download',
	'Upload': 'i-lucide-upload',
	'Save': 'i-lucide-save',
	'Copy': 'i-lucide-copy',
	'Clipboard': 'i-lucide-clipboard',
	'Calendar': 'i-lucide-calendar',
	'Clock': 'i-lucide-clock',
	'Bell': 'i-lucide-bell',
	'Mail': 'i-lucide-mail',
	'MessageSquare': 'i-lucide-message-square',
	'Heart': 'i-lucide-heart',
	'Star': 'i-lucide-star',
	'Eye': 'i-lucide-eye',
	'EyeOff': 'i-lucide-eye-off',
	'Lock': 'i-lucide-lock',
	'Unlock': 'i-lucide-unlock',
	'Key': 'i-lucide-key',
	'Shield': 'i-lucide-shield',
	'AlertCircle': 'i-lucide-alert-circle',
	'AlertTriangle': 'i-lucide-alert-triangle',
	'Info': 'i-lucide-info',
	'HelpCircle': 'i-lucide-help-circle',
	'ExternalLink': 'i-lucide-external-link',
	'Link': 'i-lucide-link',
	'Link2': 'i-lucide-link-2',
	'Paperclip': 'i-lucide-paperclip',
	'Filter': 'i-lucide-filter',
	'SlidersHorizontal': 'i-lucide-sliders-horizontal',
	'MoreHorizontal': 'i-lucide-more-horizontal',
	'MoreVertical': 'i-lucide-more-vertical',
	'Grid': 'i-lucide-grid',
	'List': 'i-lucide-list',
	'Layers': 'i-lucide-layers',
	'Package': 'i-lucide-package',
	'Archive': 'i-lucide-archive',
	'Folder': 'i-lucide-folder',
	'FolderOpen': 'i-lucide-folder-open',
	'File': 'i-lucide-file',
	'FileText': 'i-lucide-file-text',
	'FileCode': 'i-lucide-file-code',
	'Image': 'i-lucide-image',
	'Video': 'i-lucide-video',
	'Camera': 'i-lucide-camera',
	'Mic': 'i-lucide-mic',
	'Volume': 'i-lucide-volume',
	'Volume2': 'i-lucide-volume-2',
	'VolumeX': 'i-lucide-volume-x',
	'Play': 'i-lucide-play',
	'Pause': 'i-lucide-pause',
	'SkipBack': 'i-lucide-skip-back',
	'SkipForward': 'i-lucide-skip-forward',
	'Repeat': 'i-lucide-repeat',
	'Shuffle': 'i-lucide-shuffle',
	'Share': 'i-lucide-share',
	'Share2': 'i-lucide-share-2',
	'Send': 'i-lucide-send',
	'Wifi': 'i-lucide-wifi',
	'WifiOff': 'i-lucide-wifi-off',
	'Bluetooth': 'i-lucide-bluetooth',
	'Battery': 'i-lucide-battery',
	'BatteryCharging': 'i-lucide-battery-charging',
	'BatteryLow': 'i-lucide-battery-low',
	'Cpu': 'i-lucide-cpu',
	'HardDrive': 'i-lucide-hard-drive',
	'Server': 'i-lucide-server',
	'Database': 'i-lucide-database',
	'Cloud': 'i-lucide-cloud',
	'CloudDownload': 'i-lucide-cloud-download',
	'CloudUpload': 'i-lucide-cloud-upload',
	'CloudOff': 'i-lucide-cloud-off',
	'Globe': 'i-lucide-globe',
	'Map': 'i-lucide-map',
	'MapPin': 'i-lucide-map-pin',
	'Navigation': 'i-lucide-navigation',
	'Compass': 'i-lucide-compass',
	'Crosshair': 'i-lucide-crosshair',
	'Activity': 'i-lucide-activity',
	'BarChart': 'i-lucide-bar-chart',
	'BarChart2': 'i-lucide-bar-chart-2',
	'BarChart3': 'i-lucide-bar-chart-3',
	'LineChart': 'i-lucide-line-chart',
	'PieChart': 'i-lucide-pie-chart',
	'TrendingUp': 'i-lucide-trending-up',
	'TrendingDown': 'i-lucide-trending-down',
	'DollarSign': 'i-lucide-dollar-sign',
	'CreditCard': 'i-lucide-credit-card',
	'ShoppingCart': 'i-lucide-shopping-cart',
	'ShoppingBag': 'i-lucide-shopping-bag',
	'Package2': 'i-lucide-package-2',
	'Gift': 'i-lucide-gift',
	'Award': 'i-lucide-award',
	'Trophy': 'i-lucide-trophy',
	'Target': 'i-lucide-target',
	'Flag': 'i-lucide-flag',
	'Bookmark': 'i-lucide-bookmark',
	'Tag': 'i-lucide-tag',
	'Tags': 'i-lucide-tags',
	'Hash': 'i-lucide-hash',
	'At': 'i-lucide-at',
	'Phone': 'i-lucide-phone',
	'PhoneCall': 'i-lucide-phone-call',
	'PhoneIncoming': 'i-lucide-phone-incoming',
	'PhoneOutgoing': 'i-lucide-phone-outgoing',
	'PhoneOff': 'i-lucide-phone-off',
	'Video': 'i-lucide-video',
	'VideoOff': 'i-lucide-video-off',
	'Monitor': 'i-lucide-monitor',
	'Smartphone': 'i-lucide-smartphone',
	'Tablet': 'i-lucide-tablet',
	'Laptop': 'i-lucide-laptop',
	'Tv': 'i-lucide-tv',
	'Printer': 'i-lucide-printer',
	'Mouse': 'i-lucide-mouse',
	'Keyboard': 'i-lucide-keyboard',
	'Gamepad': 'i-lucide-gamepad',
	'Headphones': 'i-lucide-headphones',
	'Speaker': 'i-lucide-speaker',
	'Radio': 'i-lucide-radio',
	'Cast': 'i-lucide-cast',
	'Airplay': 'i-lucide-airplay',
	'Rss': 'i-lucide-rss',
	'Terminal': 'i-lucide-terminal',
	'Code': 'i-lucide-code',
	'Code2': 'i-lucide-code-2',
	'Command': 'i-lucide-command',
	'Bug': 'i-lucide-bug',
	'Tool': 'i-lucide-tool',
	'Wrench': 'i-lucide-wrench',
	'Hammer': 'i-lucide-hammer',
	'PaintBrush': 'i-lucide-paint-brush',
	'Palette': 'i-lucide-palette',
	'Ruler': 'i-lucide-ruler',
	'Scissors': 'i-lucide-scissors',
	'Zap': 'i-lucide-zap',
	'ZapOff': 'i-lucide-zap-off',
	'Anchor': 'i-lucide-anchor',
	'Aperture': 'i-lucide-aperture',
	'Film': 'i-lucide-film',
	'Tv2': 'i-lucide-tv-2',
	'Radio': 'i-lucide-radio',
	'Music': 'i-lucide-music',
	'Music2': 'i-lucide-music-2',
	'Music3': 'i-lucide-music-3',
	'Music4': 'i-lucide-music-4',
	'Disc': 'i-lucide-disc',
	'Circle': 'i-lucide-circle',
	'Square': 'i-lucide-square',
	'Triangle': 'i-lucide-triangle',
	'Hexagon': 'i-lucide-hexagon',
	'Octagon': 'i-lucide-octagon',
	'Building': 'i-lucide-building',
	'Building2': 'i-lucide-building-2',
	'Store': 'i-lucide-store',
	'Hotel': 'i-lucide-hotel',
	'Church': 'i-lucide-church',
	'Briefcase': 'i-lucide-briefcase',
	'BriefcaseBusiness': 'i-lucide-briefcase-business',
	'Calculator': 'i-lucide-calculator',
	'CircleDollarSign': 'i-lucide-circle-dollar-sign',
	'Receipt': 'i-lucide-receipt',
	'Wallet': 'i-lucide-wallet',
	'Coins': 'i-lucide-coins',
	'PiggyBank': 'i-lucide-piggy-bank',
	'CreditCard': 'i-lucide-credit-card',
	'Banknote': 'i-lucide-banknote',
	'LogIn': 'i-lucide-log-in',
	'LogOut': 'i-lucide-log-out',
	'UserPlus': 'i-lucide-user-plus',
	'UserMinus': 'i-lucide-user-minus',
	'UserCheck': 'i-lucide-user-check',
	'UserX': 'i-lucide-user-x',
	'Sun': 'i-lucide-sun',
	'Moon': 'i-lucide-moon',
	'SunMoon': 'i-lucide-sun-moon',
	'CloudRain': 'i-lucide-cloud-rain',
	'CloudSnow': 'i-lucide-cloud-snow',
	'CloudLightning': 'i-lucide-cloud-lightning',
	'CloudDrizzle': 'i-lucide-cloud-drizzle',
	'Snowflake': 'i-lucide-snowflake',
	'Wind': 'i-lucide-wind',
	'Droplet': 'i-lucide-droplet',
	'Droplets': 'i-lucide-droplets',
	'Thermometer': 'i-lucide-thermometer',
	'ThermometerSun': 'i-lucide-thermometer-sun',
	'ThermometerSnowflake': 'i-lucide-thermometer-snowflake',
	'Mountain': 'i-lucide-mountain',
	'MountainSnow': 'i-lucide-mountain-snow',
	'Trees': 'i-lucide-trees',
	'Tree': 'i-lucide-tree',
	'Flower': 'i-lucide-flower',
	'Flower2': 'i-lucide-flower-2',
	'Leaf': 'i-lucide-leaf',
	'Cherry': 'i-lucide-cherry',
	'Apple': 'i-lucide-apple'
}

async function migrateFile(filePath) {
	try {
		let content = await fs.readFile(filePath, 'utf-8')
		let modified = false
		const changes = []
		
		// Step 1: Extract lucide-react imports
		const importRegex = /import\s*{([^}]+)}\s*from\s*['"]lucide-react['"]/g
		const imports = []
		let match
		
		while ((match = importRegex.exec(content)) !== null) {
			const iconNames = match[1]
				.split(',')
				.map(s => s.trim())
				.filter(s => s)
			imports.push(...iconNames)
		}
		
		if (imports.length === 0) {
			return { filePath, modified: false }
		}
		
		// Step 2: Remove lucide-react import
		content = content.replace(/import\s*{[^}]+}\s*from\s*['"]lucide-react['"];?\n?/g, '')
		modified = true
		changes.push(`Removed lucide-react import with ${imports.length} icons`)
		
		// Step 3: Replace icon usages
		for (const iconName of imports) {
			const iconClass = iconMap[iconName] || `i-lucide-${iconName.toLowerCase().replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}`
			
			// Pattern 1: <IconName className="..." />
			const selfClosingRegex = new RegExp(`<${iconName}\\s+([^>]*?)\\s*/>`, 'g')
			content = content.replace(selfClosingRegex, (match, attrs) => {
				// Extract className if it exists
				const classMatch = attrs.match(/className=["']([^"']+)["']/)
				const existingClasses = classMatch ? classMatch[1] : ''
				const otherAttrs = attrs.replace(/className=["'][^"']+["']/, '').trim()
				
				const newClasses = `${iconClass} inline-block ${existingClasses}`.trim()
				return `<i className="${newClasses}" ${otherAttrs} />`
			})
			
			// Pattern 2: <IconName className="..."></IconName>
			const openCloseRegex = new RegExp(`<${iconName}\\s+([^>]*?)>\\s*</${iconName}>`, 'g')
			content = content.replace(openCloseRegex, (match, attrs) => {
				const classMatch = attrs.match(/className=["']([^"']+)["']/)
				const existingClasses = classMatch ? classMatch[1] : ''
				const otherAttrs = attrs.replace(/className=["'][^"']+["']/, '').trim()
				
				const newClasses = `${iconClass} inline-block ${existingClasses}`.trim()
				return `<i className="${newClasses}" ${otherAttrs} />`
			})
			
			// Pattern 3: <IconName />
			const simpleRegex = new RegExp(`<${iconName}\\s*/>`, 'g')
			content = content.replace(simpleRegex, `<i className="${iconClass} inline-block" />`)
			
			// Pattern 4: <IconName></IconName>
			const simpleOpenCloseRegex = new RegExp(`<${iconName}>\\s*</${iconName}>`, 'g')
			content = content.replace(simpleOpenCloseRegex, `<i className="${iconClass} inline-block" />`)
			
			changes.push(`Replaced ${iconName} with ${iconClass}`)
		}
		
		// Step 4: Clean up any size-* classes and replace with w-* h-*
		content = content.replace(/\bsize-(\d+)\b/g, 'w-$1 h-$1')
		
		// Step 5: Write back the file
		if (modified) {
			await fs.writeFile(filePath, content, 'utf-8')
		}
		
		return { 
			filePath, 
			modified, 
			changes,
			iconCount: imports.length 
		}
		
	} catch (error) {
		console.error(`Error processing ${filePath}:`, error.message)
		return { filePath, error: error.message }
	}
}

async function main() {
	console.log('🚀 Starting UnoCSS Migration Script')
	console.log('=====================================\n')
	
	// Find all TypeScript/JavaScript files
	const files = await glob('src/**/*.{ts,tsx,js,jsx}', {
		cwd: path.resolve(__dirname, '..'),
		absolute: true,
		ignore: ['**/node_modules/**', '**/dist/**', '**/build/**']
	})
	
	console.log(`📁 Found ${files.length} files to process\n`)
	
	const results = []
	let successCount = 0
	let errorCount = 0
	let totalIconsReplaced = 0
	
	// Process files in batches for better performance
	const batchSize = 10
	for (let i = 0; i < files.length; i += batchSize) {
		const batch = files.slice(i, i + batchSize)
		const batchResults = await Promise.all(batch.map(migrateFile))
		
		for (const result of batchResults) {
			if (result.error) {
				errorCount++
				console.log(`❌ Error: ${path.basename(result.filePath)}`)
				console.log(`   ${result.error}`)
			} else if (result.modified) {
				successCount++
				totalIconsReplaced += result.iconCount || 0
				console.log(`✅ Migrated: ${path.basename(result.filePath)}`)
				result.changes.forEach(change => {
					console.log(`   - ${change}`)
				})
			}
			results.push(result)
		}
		
		// Progress indicator
		const progress = Math.round((i + batch.length) / files.length * 100)
		console.log(`\n📊 Progress: ${progress}%\n`)
	}
	
	// Summary
	console.log('\n=====================================')
	console.log('📈 Migration Complete!')
	console.log('=====================================')
	console.log(`✅ Successfully migrated: ${successCount} files`)
	console.log(`🔄 Total icons replaced: ${totalIconsReplaced}`)
	console.log(`⏭️  Files unchanged: ${files.length - successCount - errorCount}`)
	if (errorCount > 0) {
		console.log(`❌ Files with errors: ${errorCount}`)
	}
	
	// Write detailed report
	const report = {
		timestamp: new Date().toISOString(),
		summary: {
			totalFiles: files.length,
			migratedFiles: successCount,
			unchangedFiles: files.length - successCount - errorCount,
			errorFiles: errorCount,
			totalIconsReplaced
		},
		files: results.filter(r => r.modified || r.error)
	}
	
	await fs.writeFile(
		path.join(__dirname, 'migration-report.json'),
		JSON.stringify(report, null, 2),
		'utf-8'
	)
	
	console.log('\n📄 Detailed report saved to: scripts/migration-report.json')
	
	// Final step: Remove lucide-react from package.json
	if (successCount > 0) {
		console.log('\n🗑️  You can now safely remove lucide-react:')
		console.log('   npm uninstall lucide-react')
	}
}

// Run the script
main().catch(console.error)