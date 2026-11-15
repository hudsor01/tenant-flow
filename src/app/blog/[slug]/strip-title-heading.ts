/** A first line that is a markdown H1 (`# Text`), with the blank lines after it. */
const LEADING_H1 = /^[ \t]*(?:\r?\n[ \t]*)*#[ \t]+([^\r\n]*)(?:\r?\n)*/;

const normalize = (text: string) =>
	text.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Drop a post body's opening H1 when it repeats the post's title.
 *
 * The page renders `post.title` as its only `<h1>`. Posts the n8n writer
 * published before 2026-11-15 also open their body with `# <title>`, which
 * showed the title a second time as a second `<h1>`. Only an opening H1 whose
 * text matches the title (case and spacing ignored) is removed, with the blank
 * lines after it; any other body is returned unchanged.
 */
export function stripTitleHeading(content: string, title: string): string {
	const match = LEADING_H1.exec(content);
	if (!match || normalize(match[1] ?? "") !== normalize(title)) return content;
	return content.slice(match[0].length);
}
