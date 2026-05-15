/**
 * Polyfill web streams for MSW in jsdom environment.
 * Must run as a separate setupFile BEFORE unit-setup.ts because ESM
 * static imports are hoisted above runtime code.
 *
 * Uses Object.defineProperty rather than `globalThis.X = X` because
 * Node's `node:stream/web` types don't structurally match DOM's
 * lib.dom.d.ts stream types — direct assignment would require either a
 * `@ts-expect-error` suppression or `as unknown as` cast (banned per
 * CLAUDE.md). defineProperty's value parameter is `unknown` so neither
 * is needed.
 */
import {
	ReadableStream,
	TransformStream,
	WritableStream,
} from "node:stream/web";

function polyfill(name: string, value: unknown) {
	if (typeof (globalThis as Record<string, unknown>)[name] === "undefined") {
		Object.defineProperty(globalThis, name, {
			value,
			writable: true,
			configurable: true,
		});
	}
}

polyfill("TransformStream", TransformStream);
polyfill("ReadableStream", ReadableStream);
polyfill("WritableStream", WritableStream);
