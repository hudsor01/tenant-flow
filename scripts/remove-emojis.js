#!/usr/bin/env node

/**
 * Script to remove all emojis from the codebase
 * Per CLAUDE.md: NO EMOJIS in professional communication
 */

import fs from 'fs';
import path from 'path';

// Comprehensive emoji regex pattern
const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}\u{FE00}-\u{FE0F}\u{E0020}-\u{E007F}\u{1F191}-\u{1F251}]/gu;

// Additional common emoji patterns not covered by Unicode ranges
const additionalEmojis = /[\u2764\uFE0F\u2665\uFE0F\u2757\u2755\u2753\u2714\u2705\u274C\u274E\u26A0\u26A1\u2B50\u2B55\u2728\u{1F4A1}\u{1F3AF}\u{1F4DD}\u{1F512}\u{1F680}\u{1F525}\u{1F41B}\u{1F4A5}\u{2728}\u{1F3D7}\u{1F4F1}\u{1F4BB}\u{1F310}\u{1F4C8}\u{1F4C9}\u{23F0}\u{1F514}\u{1F4E7}\u{1F4DE}\u{1F3E0}\u{1F511}]/gu;

// Files from the search
const filesToProcess = process.argv.slice(2);

if (filesToProcess.length === 0) {
	console.log('Usage: node remove-emojis.js <file1> <file2> ...');
	process.exit(1);
}

let totalFiles = 0;
let totalEmojisRemoved = 0;

filesToProcess.forEach((filePath) => {
	try {
		if (!fs.existsSync(filePath)) {
			console.log(`WARNING: Skipping missing file: ${filePath}`);
			return;
		}

		const content = fs.readFileSync(filePath, 'utf8');
		let cleaned = content;

		// Count emojis before removal
		const emojiMatches = content.match(emojiRegex) || [];
		const additionalMatches = content.match(additionalEmojis) || [];
		const totalInFile = emojiMatches.length + additionalMatches.length;

		if (totalInFile === 0) {
			return; // Skip files with no emojis
		}

		// Remove emojis
		cleaned = cleaned.replace(emojiRegex, '');
		cleaned = cleaned.replace(additionalEmojis, '');

		// Clean up multiple spaces left by emoji removal
		cleaned = cleaned.replace(/ {2,}/g, ' ');

		// Clean up empty list item lines
		cleaned = cleaned.replace(/^\s*[-*]\s*$/gm, '');

		// Write back
		fs.writeFileSync(filePath, cleaned, 'utf8');

		totalFiles++;
		totalEmojisRemoved += totalInFile;
		console.log(`[OK] Processed: ${filePath} (removed ${totalInFile} emojis)`);

	} catch (error) {
		console.error(`[ERROR] Error processing ${filePath}:`, error.message);
	}
});

console.log(`\nSummary: Processed ${totalFiles} files, removed ${totalEmojisRemoved} emojis`);
