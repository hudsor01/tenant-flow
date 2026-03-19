/**
 * Polyfill web streams for MSW in jsdom environment.
 * Must run as a separate setupFile BEFORE unit-setup.ts
 * because ESM static imports are hoisted above runtime code.
 */
import {
	TransformStream,
	ReadableStream,
	WritableStream
} from 'node:stream/web'

if (typeof globalThis.TransformStream === 'undefined') {
	// @ts-expect-error -- polyfill for jsdom
	globalThis.TransformStream = TransformStream
}
if (typeof globalThis.ReadableStream === 'undefined') {
	// @ts-expect-error -- polyfill for jsdom
	globalThis.ReadableStream = ReadableStream
}
if (typeof globalThis.WritableStream === 'undefined') {
	// @ts-expect-error -- polyfill for jsdom
	globalThis.WritableStream = WritableStream
}
