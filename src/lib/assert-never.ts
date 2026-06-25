/**
 * Compile-time exhaustiveness guard for switches over finite unions.
 *
 * Place a call in the `default` branch of a `switch` (or the final `else` of an
 * if/else chain) that is meant to handle every member of a union. When all
 * cases are handled, the argument narrows to `never` and the call typechecks;
 * add a new union member without handling it and the compiler raises an error
 * at the call site — turning a silent fallthrough into a build failure.
 *
 * At runtime the call should be unreachable (callers narrow the union at their
 * data boundary), so it throws to surface drift loudly instead of returning a
 * misleading fallback.
 *
 * @example
 * function toBadge(status: InspectionStatus): BadgeVariant {
 *   switch (status) {
 *     case "pending": return "secondary";
 *     // ...every other case...
 *     default: return assertNever(status, "toBadge");
 *   }
 * }
 */
export function assertNever(value: never, context?: string): never {
	throw new Error(
		`Unhandled case${context ? ` in ${context}` : ""}: ${String(value)}`,
	);
}
