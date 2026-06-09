// JSON structural-diff mode — a pure parse + recursive-compare module.
// Deliberately independent of `./lcs.ts` and the line/word engine: this is a
// value-tree comparison, not a sequence-alignment problem.
//
// Semantics (v1):
//   - Type mismatch at a path            → 'type-changed'
//   - Objects: compared by KEY SET, order ignored.
//       key only on left  → 'removed'; key only on right → 'added';
//       key in both       → recurse.
//   - Arrays: ORDER-SENSITIVE, compared by index. Trailing extras on one side
//       → 'added'/'removed' at those indices; same index → recurse.
//       (No LCS array alignment in v1 — a noted fast-follow. Index-wise still
//        produces a correct equal/not-equal verdict in every case.)
//   - Numbers: compared by parsed value (1 === 1.0, 1e0 === 1, -0 === 0).
//   - Strings / booleans / null: exact (null only equals null, etc.).

import type { JsonDiffResult, JsonDifference } from './types';

export type ParseResult =
	| { ok: true; value: unknown }
	| { ok: false; error: string };

/**
 * Parse `text` as JSON without ever throwing. Empty / whitespace-only input
 * is treated as an error (there is nothing to compare), matching the UI's
 * per-pane "invalid JSON" guard. Surrounding whitespace around otherwise-valid
 * JSON is tolerated (JSON.parse already trims it).
 */
export function parseJsonSafe(text: string): ParseResult {
	if (text.trim() === '') {
		return { ok: false, error: 'Empty input — paste JSON to compare.' };
	}
	try {
		return { ok: true, value: JSON.parse(text) };
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		return { ok: false, error: message };
	}
}

/** The structural JSON types this module distinguishes. */
type JsonType = 'null' | 'boolean' | 'number' | 'string' | 'array' | 'object';

function typeOf(value: unknown): JsonType {
	if (value === null) return 'null';
	if (Array.isArray(value)) return 'array';
	const t = typeof value;
	if (t === 'boolean') return 'boolean';
	if (t === 'number') return 'number';
	if (t === 'string') return 'string';
	// Any remaining object (plain object). `undefined`/functions can't occur in
	// parsed JSON, so this is exhaustive for our inputs.
	return 'object';
}

/**
 * Recursive structural diff of two parsed JSON values. Returns the verdict
 * plus a flat, deterministically-ordered list of differences. Pure; never
 * throws on any JSON-shaped input.
 */
export function diffJson(a: unknown, b: unknown): JsonDiffResult {
	const differences: JsonDifference[] = [];
	walk('root', a, b, differences);
	return { equal: differences.length === 0, differences };
}

function walk(path: string, a: unknown, b: unknown, out: JsonDifference[]): void {
	const ta = typeOf(a);
	const tb = typeOf(b);

	if (ta !== tb) {
		out.push({ path, kind: 'type-changed', before: a, after: b });
		return;
	}

	switch (ta) {
		case 'object':
			walkObject(path, a as Record<string, unknown>, b as Record<string, unknown>, out);
			return;
		case 'array':
			walkArray(path, a as unknown[], b as unknown[], out);
			return;
		case 'number':
			// Parsed-value equality. `Object.is` would separate -0 from 0, which
			// JSON does not, so use `===` (handles 1 === 1.0, 1e0 === 1, -0 === 0).
			if ((a as number) !== (b as number)) {
				out.push({ path, kind: 'changed', before: a, after: b });
			}
			return;
		case 'string':
		case 'boolean':
			if (a !== b) {
				out.push({ path, kind: 'changed', before: a, after: b });
			}
			return;
		case 'null':
			// null === null always; type-mismatch already handled above.
			return;
	}
}

function walkObject(
	path: string,
	a: Record<string, unknown>,
	b: Record<string, unknown>,
	out: JsonDifference[]
): void {
	const keysA = Object.keys(a);
	const keysB = Object.keys(b);
	const inB = new Set(keysB);

	// Removed keys (left-only) + recurse into shared keys, in left order.
	for (const key of keysA) {
		const childPath = path + '.' + key;
		if (!inB.has(key)) {
			out.push({ path: childPath, kind: 'removed', before: a[key] });
		} else {
			walk(childPath, a[key], b[key], out);
		}
	}

	// Added keys (right-only), in right order.
	const inA = new Set(keysA);
	for (const key of keysB) {
		if (!inA.has(key)) {
			out.push({ path: path + '.' + key, kind: 'added', after: b[key] });
		}
	}
}

function walkArray(path: string, a: unknown[], b: unknown[], out: JsonDifference[]): void {
	const max = Math.max(a.length, b.length);
	for (let i = 0; i < max; i++) {
		const childPath = path + '[' + i + ']';
		const hasA = i < a.length;
		const hasB = i < b.length;
		if (hasA && hasB) {
			walk(childPath, a[i], b[i], out);
		} else if (hasB) {
			out.push({ path: childPath, kind: 'added', after: b[i] });
		} else {
			out.push({ path: childPath, kind: 'removed', before: a[i] });
		}
	}
}
