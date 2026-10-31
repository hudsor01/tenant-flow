// with-env.mjs: run a command with the worktree's env file in its environment.
//
// Usage, from the worktree root:
//   bun .planning/tailwind-shadcn/audit/with-env.mjs <cmd> [args...]
// e.g. bun .planning/tailwind-shadcn/audit/with-env.mjs bun run test:e2e -- --project=owner-axe
//
// Why it exists (measured with bun 1.3.14, 66.2-06): `bun <file>` loads the cwd's
// local env file into that process, but `bun run <script>` does not hand it to the
// script's child processes, so Playwright's loginAsOwner saw no credentials and the
// owner specs skipped. This file is run by bun (which loads the env file into it)
// and starts the real command with that environment, explicitly.
//
// Safety: this file reads no env file itself, prints no variable and writes nothing;
// the exit status is the command's own.
import { spawnSync } from "node:child_process";

const [cmd, ...args] = process.argv.slice(2);
if (!cmd) {
	console.error("usage: bun with-env.mjs <cmd> [args...]");
	process.exit(2);
}
const result = spawnSync(cmd, args, { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
