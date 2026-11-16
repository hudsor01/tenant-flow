import { describe, expect, it } from "vitest";
import {
	LLMS_FULL_HEAD,
	LLMS_FULL_PREAMBLE,
	LLMS_FULL_TAIL,
} from "../src/lib/seo/llms-full-facts";
import { buildCorpusChunks, CORPUS_SOURCE } from "./rag-index-blog-corpus";

const chunks = buildCorpusChunks();
const headings = chunks.map((c) => c.heading);
const corpus = chunks.map((c) => c.content).join("\n\n");

describe("buildCorpusChunks (the blog factory's grounding facts)", () => {
	it("chunks exactly /llms-full.txt's product sections, tagged with the source a re-index replaces", () => {
		expect(headings).toEqual([
			"What is TenantFlow",
			"Core capabilities",
			"Pricing (USD, billed monthly or annually)",
			"Comparisons",
			"Free resources (no signup required)",
			"Company",
			"Legal",
			"What TenantFlow is NOT",
		]);
		expect(
			CORPUS_SOURCE,
			"blog_rag_chunks rows indexed 2026-06-08 carry source 'llms-full.txt'; the re-index deletes by source, so renaming it strands those rows, and match_blog_rag_chunks (no source filter) keeps serving them",
		).toBe("llms-full.txt");
		expect(chunks.every((c) => c.source === CORPUS_SOURCE)).toBe(true);
		expect(corpus).toContain(LLMS_FULL_HEAD.trim());
		expect(corpus).toContain(LLMS_FULL_TAIL.trim());
	});

	it("leaves out the page's title preamble, so it never takes a retrieval slot", () => {
		expect(corpus).not.toContain("for LLM ingestion");
		expect(corpus).not.toContain(LLMS_FULL_PREAMBLE.split("\n")[0]);
	});

	it("leaves out the per-post blog digest, so no older post's wording becomes a fact", () => {
		expect(headings).not.toContain("Blog");
		expect(corpus).not.toMatch(/^## Blog$/m);
		expect(corpus).not.toContain("tenantflow.app/blog/");
	});

	it("carries none of the 2026-06-08 corpus's stale claims", () => {
		expect(corpus).not.toMatch(/docuseal/i);
		expect(corpus).not.toMatch(/turnover/i);
		expect(corpus).not.toMatch(/category tagging/i);
		expect(corpus).not.toMatch(/tax-ready/i);
		expect(corpus).not.toMatch(/\b1[-–]20 units\b/);
		// No 1099 claim either way (src/app/(owner)/reports/__tests__/no-1099-section.test.tsx).
		expect(corpus).not.toContain("1099");
	});

	it("states the facts the factory's posts got wrong", () => {
		expect(corpus).toContain("tenants cannot submit requests");
		expect(corpus).toContain("Lease e-signing (Growth and Max)");
		expect(corpus).toContain("It does not include the payment day");
		expect(corpus).toContain("no notes, communication log, or payment history");
		expect(corpus).toContain(
			"There are no folders, tags, version history, or sharing links.",
		);
		expect(corpus).toContain("Not a messaging tool");
	});

	it("keeps every chunk short enough to embed without truncation", () => {
		for (const chunk of chunks) {
			expect(chunk.content.length, chunk.heading).toBeLessThanOrEqual(8000);
		}
	});
});
