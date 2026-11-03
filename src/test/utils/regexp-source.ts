/**
 * Building blocks for the regular expressions that source-scanning guards
 * assemble at run time.
 *
 * NOT A BARREL FILE. Everything below is declared here and nothing is
 * re-exported (CLAUDE.md zero-tolerance rule 2).
 */

/**
 * `text` as regex source that matches exactly `text`: every character that is
 * special outside a character class (`\ ^ $ . * + ? ( ) [ ] { } |`) gains a
 * backslash. Escaping only the characters a caller expects (`.` in a member
 * path, `$` in an identifier) breaks on the first input holding any other one,
 * so every guard that puts a name or a label into a pattern goes through here.
 * The result is not safe inside a `[...]` class, where `-` is special too.
 */
export function escapeRegExp(text: string): string {
	return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Regex source for any one of `names` as a whole JavaScript identifier (or a
 * dotted member path such as `mutationKeys.reports`): neither end may touch
 * another identifier character. `\b` cannot say this, because `$` is an
 * identifier character but not a word character: `\bfoo` matches inside `$foo`,
 * and `\b\$foo` cannot match `$foo` after a space or at the start of a line.
 * An empty list throws: an empty alternation would match at every boundary.
 */
export function identifierSource(names: string | readonly string[]): string {
	const list = typeof names === "string" ? [names] : names;
	if (list.length === 0) throw new Error("identifierSource needs a name");
	return `(?<![\\w$])(?:${list.map(escapeRegExp).join("|")})(?![\\w$])`;
}

/**
 * Regex source for the gap between a JSX opening tag and its first child:
 * whitespace, and any number of `{/* ... *\/}` comments each followed by
 * whitespace. A comment's body cannot contain `*\/}`, so it ends at the first
 * one and there is exactly one way through the gap: no two quantifiers can
 * match the same text, which keeps a failed match linear. The older
 * `\{\/\*[\s\S]*?\*\/\}` body could also run on past a `*\/}` into the next
 * comment, so a run of n comments split 2^n ways when nothing followed it,
 * and a comment could swallow a real child between two comments.
 */
export const JSX_CHILD_GAP = String.raw`\s*(?:\{\/\*(?:(?!\*\/\})[\s\S])*\*\/\}\s*)*`;
