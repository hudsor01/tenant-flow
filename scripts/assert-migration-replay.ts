/**
 * CLI in front of scripts/migration-replay-assertions.ts, for
 * .github/workflows/migration-replay.yml.
 *
 * The workflow does the querying -- that is the part that needs a database --
 * and passes what it read to one of these subcommands. The comparisons
 * themselves live in the module next door, where
 * migration-replay-assertions.test.ts can fail them on purpose.
 *
 *   bun scripts/assert-migration-replay.ts applied <expected> <applied>
 *   bun scripts/assert-migration-replay.ts no-network <wrappers> <server> <tables>
 *   bun scripts/assert-migration-replay.ts test-cast   # rows on stdin
 *
 * Exit 0 on success, 1 on a failed assertion (with a GitHub `::error::`
 * annotation), 2 on misuse.
 */
import { readFileSync } from "node:fs";
import {
	type AssertionResult,
	errorAnnotation,
	warningAnnotation,
} from "./assertion-result";
import {
	assertEveryMigrationApplied,
	assertNoMigrationReachedTheNetwork,
	assertSeededCast,
} from "./migration-replay-assertions";

const USAGE = `usage:
  bun scripts/assert-migration-replay.ts applied <expected> <applied>
  bun scripts/assert-migration-replay.ts no-network <wrappers> <server> <tables>
  bun scripts/assert-migration-replay.ts test-cast   # rows on stdin`;

function finish(result: AssertionResult): never {
	if (!result.ok) {
		console.log(errorAnnotation(result.message));
		console.log(result.message);
		process.exit(1);
	}
	// No replay assertion returns `unverified` today -- each of them either
	// compares what it was given or refuses the input. The branch exists because
	// the shared type permits it, and printing a result that proved nothing as a
	// plain success line is the exact failure this gate family is about. Exit 1:
	// unlike the drift gate, this one runs against a stack it built itself, so
	// "could not check" means the run is broken rather than under-credentialled.
	if (result.unverified === true) {
		console.log(warningAnnotation(result.message));
		console.log(result.message);
		process.exit(1);
	}
	console.log(result.message);
	process.exit(0);
}

function misuse(reason: string): never {
	console.log(errorAnnotation(reason));
	console.log(USAGE);
	process.exit(2);
}

const [subcommand, ...args] = process.argv.slice(2);

// Plain conditionals rather than a switch: `finish` and `misuse` return
// `never`, which makes a trailing `break` unreachable code to tsc and its
// absence a fallthrough to biome. Nothing below the conditionals is reachable
// for a known subcommand.
if (subcommand === "applied") {
	if (args.length !== 2) misuse("`applied` takes exactly two arguments");
	finish(assertEveryMigrationApplied(args[0] ?? "", args[1] ?? ""));
}
if (subcommand === "no-network") {
	if (args.length !== 3) misuse("`no-network` takes exactly three arguments");
	finish(
		assertNoMigrationReachedTheNetwork(
			args[0] ?? "",
			args[1] ?? "",
			args[2] ?? "",
		),
	);
}
if (subcommand === "test-cast") {
	// fd 0, so this works the same under bun and node.
	finish(assertSeededCast(readFileSync(0, "utf8")));
}
misuse(`unknown subcommand ${JSON.stringify(subcommand ?? "")}`);
