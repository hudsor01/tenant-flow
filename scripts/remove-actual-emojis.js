#!/usr/bin/env node

/**
 * Script to remove actual pictograph emojis from codebase
 * Does NOT remove typographic punctuation (smart quotes, dashes, arrows, etc.)
 * Per CLAUDE.md: NO EMOJIS in professional communication
 */

import fs from 'fs';

// Only actual emoji pictographs - NOT punctuation/typography
const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

const filesToProcess = process.argv.slice(2);

if (filesToProcess.length === 0) {
	console.log('Usage: node remove-actual-emojis.js <file1> <file2> ...');
	process.exit(1);
}

let totalFiles = 0;
let totalEmojisRemoved = 0;

filesToProcess.forEach((filePath) => {
	try {
		if (!fs.existsSync(filePath)) {
			return;
		}

		const content = fs.readFileSync(filePath, 'utf8');
		const emojiMatches = content.match(emojiRegex) || [];

		if (emojiMatches.length === 0) {
			return;
		}

		// Remove emojis
		let cleaned = content.replace(emojiRegex, '');

		// Clean up multiple spaces left by emoji removal
		cleaned = cleaned.replace(/ {2,}/g, ' ');

		// Clean up empty list item lines
		cleaned = cleaned.replace(/^\s*[-*]\s*$/gm, '');

		fs.writeFileSync(filePath, cleaned, 'utf8');

		totalFiles++;
		totalEmojisRemoved += emojiMatches.length;
		console.log(`[OK] ${filePath} (removed ${emojiMatches.length} emojis)`);

	} catch (error) {
		console.error(`[ERROR] ${filePath}:`, error.message);
	}
});

console.log(`\nProcessed ${totalFiles} files, removed ${totalEmojisRemoved} emojis`);
