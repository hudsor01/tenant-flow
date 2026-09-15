# Agent instructions

Project rules, architecture, and zero-tolerance constraints live in
[CLAUDE.md](./CLAUDE.md). Read that first.

This file exists so `next dev` has somewhere to keep its managed block below.
Without it, Next.js appends that block to `CLAUDE.md` instead and dirties the
working tree on every dev run (see `writeAgentFiles` in
`node_modules/next/dist/server/lib/generate-agent-files.js`, which prefers
`AGENTS.md` whenever it exists).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
