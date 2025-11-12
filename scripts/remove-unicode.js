#!/usr/bin/env node

/**
 * Script to remove Unicode decorative characters and replace with ASCII equivalents
 * Per CLAUDE.md: NO EMOJIS in professional communication
 */

import fs from 'fs';

const replacements = [
	// Smart quotes
	['\u2018', "'"],  // Left single quote
	['\u2019', "'"],  // Right single quote/apostrophe
	['\u201C', '"'],  // Left double quote
	['\u201D', '"'],  // Right double quote
	// Ellipsis
	['\u2026', '...'],
	// Dashes
	['\u2013', '-'],   // En dash
	['\u2014', '--'],  // Em dash
	// Other symbols
	['\u00B0', ' degrees'],  // Degree symbol
	['\u2122', '(TM)'],      // Trademark
	['\u00AE', '(R)'],       // Registered
	['\u00A9', '(C)'],       // Copyright
	// Command key
	['\u2318', 'Cmd+'],
];

const filesToProcess = process.argv.slice(2);

if (filesToProcess.length === 0) {
	console.log('Usage: node remove-unicode.js <file1> <file2> ...');
	process.exit(1);
}

let totalFiles = 0;
let totalReplacements = 0;

filesToProcess.forEach((filePath) => {
	try {
		if (!fs.existsSync(filePath)) {
			return;
		}

		let content = fs.readFileSync(filePath, 'utf8');
		let originalContent = content;

		// Apply all replacements
		for (const [unicode, ascii] of replacements) {
			const regex = new RegExp(unicode.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
			content = content.replace(regex, ascii);
		}

		if (content !== originalContent) {
			fs.writeFileSync(filePath, content, 'utf8');
			totalFiles++;
			totalReplacements += originalContent.length - content.length;
		}
	} catch (error) {
		console.error(`[ERROR] ${filePath}:`, error.message);
	}
});

console.log(`Processed ${totalFiles} files`);
