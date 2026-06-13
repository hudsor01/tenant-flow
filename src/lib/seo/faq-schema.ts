import type { FAQPage } from "schema-dts";

interface FaqItem {
	question: string;
	answer: string;
}

/**
 * Create a FAQPage JSON-LD schema from question/answer pairs.
 * Produces schema-dts typed output for use with JsonLdScript component.
 */
export function createFaqJsonLd(items: FaqItem[]): FAQPage {
	return {
		"@type": "FAQPage",
		mainEntity: items.map((item) => ({
			"@type": "Question" as const,
			name: item.question,
			acceptedAnswer: {
				"@type": "Answer" as const,
				text: item.answer,
			},
		})),
	};
}

/**
 * Parse a trailing markdown FAQ section into question/answer pairs.
 *
 * Recognizes a section whose heading is `## FAQ` or
 * `## Frequently Asked Questions` (case-insensitive). Inside that section
 * each `### question` heading pairs with the prose paragraph(s) that follow
 * it, up to the next `###` heading (or the end of the section / a later
 * `## ` heading). This is a PURE function — it never touches the DOM or any
 * schema helper — so the post page can decide whether enough pairs exist
 * (>= 3) before emitting `FAQPage` JSON-LD via `createFaqJsonLd`. Returns an
 * empty array when no FAQ section is present.
 */
export function parseFaqSection(content: string): FaqItem[] {
	const lines = content.split("\n");

	// Locate the FAQ section heading (`## FAQ` / `## Frequently Asked Questions`).
	const headingPattern = /^##\s+(faq|frequently asked questions)\s*$/i;
	let start = -1;
	for (let i = 0; i < lines.length; i++) {
		if (headingPattern.test((lines[i] ?? "").trim())) {
			start = i + 1;
			break;
		}
	}
	if (start === -1) return [];

	const items: FaqItem[] = [];
	let question: string | null = null;
	let answerLines: string[] = [];

	const flush = () => {
		if (question === null) return;
		const answer = answerLines.join("\n").trim();
		if (answer) items.push({ question, answer });
		question = null;
		answerLines = [];
	};

	for (let i = start; i < lines.length; i++) {
		const raw = lines[i] ?? "";
		const trimmed = raw.trim();

		// A new `## ` heading ends the FAQ section entirely.
		if (/^##\s+/.test(trimmed) && !/^###/.test(trimmed)) {
			break;
		}

		const questionMatch = trimmed.match(/^###\s+(.+?)\s*$/);
		if (questionMatch?.[1]) {
			flush();
			question = questionMatch[1].trim();
			continue;
		}

		if (question !== null) {
			answerLines.push(raw);
		}
	}
	flush();

	return items;
}
