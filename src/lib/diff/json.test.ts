// JSON structural-diff unit tests. Recursive, order-ignoring on object keys,
// order-sensitive index-wise on arrays, parsed-value number equality.
// Colocated with json.ts, matching the style of engine.test.ts. These are
// the load-bearing tests for the new mode — written before the implementation.

import { describe, expect, it } from 'vitest';
import { parseJsonSafe, diffJson } from './json';
import type { JsonDifference } from './types';

// Helper: find the difference entry at an exact path (or undefined).
function at(diffs: JsonDifference[], path: string): JsonDifference | undefined {
	return diffs.find((d) => d.path === path);
}

describe('parseJsonSafe', () => {
	it('parses a valid object', () => {
		const r = parseJsonSafe('{"a":1}');
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.value).toEqual({ a: 1 });
	});

	it('parses a top-level scalar', () => {
		expect(parseJsonSafe('42')).toEqual({ ok: true, value: 42 });
		expect(parseJsonSafe('"hi"')).toEqual({ ok: true, value: 'hi' });
		expect(parseJsonSafe('true')).toEqual({ ok: true, value: true });
		expect(parseJsonSafe('null')).toEqual({ ok: true, value: null });
	});

	it('parses a top-level array', () => {
		expect(parseJsonSafe('[1,2,3]')).toEqual({ ok: true, value: [1, 2, 3] });
	});

	it('returns ok:false with a message for invalid JSON (never throws)', () => {
		const r = parseJsonSafe('{not json}');
		expect(r.ok).toBe(false);
		if (!r.ok) expect(typeof r.error).toBe('string');
		if (!r.ok) expect(r.error.length).toBeGreaterThan(0);
	});

	it('returns ok:false for empty input', () => {
		expect(parseJsonSafe('').ok).toBe(false);
	});

	it('returns ok:false for whitespace-only input', () => {
		expect(parseJsonSafe('   \n\t ').ok).toBe(false);
	});

	it('returns ok:false for a trailing-comma object', () => {
		expect(parseJsonSafe('{"a":1,}').ok).toBe(false);
	});

	it('tolerates surrounding whitespace around valid JSON', () => {
		expect(parseJsonSafe('  \n {"a":1}\n  ')).toEqual({ ok: true, value: { a: 1 } });
	});
});

describe('diffJson — equality verdict', () => {
	it('reports equal:true with no differences for identical objects', () => {
		const r = diffJson({ a: 1, b: 2 }, { a: 1, b: 2 });
		expect(r.equal).toBe(true);
		expect(r.differences).toEqual([]);
	});

	it('ignores object key ORDER (key-set equality)', () => {
		const r = diffJson({ a: 1, b: 2, c: 3 }, { c: 3, b: 2, a: 1 });
		expect(r.equal).toBe(true);
		expect(r.differences).toEqual([]);
	});

	it('reports equal:true for two identical nested structures', () => {
		const left = { user: { name: 'x', roles: ['a', 'b'] }, n: 1 };
		const right = { n: 1, user: { roles: ['a', 'b'], name: 'x' } };
		expect(diffJson(left, right).equal).toBe(true);
	});

	it('reports equal:true for identical top-level scalars', () => {
		expect(diffJson(5, 5).equal).toBe(true);
		expect(diffJson('s', 's').equal).toBe(true);
		expect(diffJson(true, true).equal).toBe(true);
		expect(diffJson(null, null).equal).toBe(true);
	});
});

describe('diffJson — number value equality', () => {
	it('treats 1 and 1.0 as equal (parsed-value, not lexical)', () => {
		expect(diffJson(1, 1.0).equal).toBe(true);
	});

	it('treats 1e0 and 1 as equal', () => {
		expect(diffJson(1e0, 1).equal).toBe(true);
	});

	it('treats -0 and 0 as equal', () => {
		expect(diffJson(-0, 0).equal).toBe(true);
	});

	it('inside an object: {"x":1.0} equals {"x":1}', () => {
		const left = parseJsonSafe('{"x":1.0}');
		const right = parseJsonSafe('{"x":1}');
		if (left.ok && right.ok) {
			expect(diffJson(left.value, right.value).equal).toBe(true);
		} else {
			throw new Error('fixtures must parse');
		}
	});

	it('reports a change for genuinely different numbers', () => {
		const r = diffJson(1, 2);
		expect(r.equal).toBe(false);
		const d = at(r.differences, 'root');
		expect(d).toBeDefined();
		expect(d!.kind).toBe('changed');
		expect(d!.before).toBe(1);
		expect(d!.after).toBe(2);
	});
});

describe('diffJson — scalar exactness', () => {
	it('null only equals null (null vs false is a difference)', () => {
		const r = diffJson(null, false);
		expect(r.equal).toBe(false);
	});

	it('false only equals false (false vs 0 is a type change)', () => {
		const r = diffJson(false, 0);
		expect(r.equal).toBe(false);
		expect(at(r.differences, 'root')!.kind).toBe('type-changed');
	});

	it('string change at root is "changed"', () => {
		const r = diffJson('hello', 'world');
		expect(r.equal).toBe(false);
		const d = at(r.differences, 'root')!;
		expect(d.kind).toBe('changed');
		expect(d.before).toBe('hello');
		expect(d.after).toBe('world');
	});

	it('boolean change at root is "changed", not "type-changed"', () => {
		const r = diffJson(true, false);
		const d = at(r.differences, 'root')!;
		expect(d.kind).toBe('changed');
	});
});

describe('diffJson — type changes', () => {
	it('object vs array at a path is a type change', () => {
		const r = diffJson({ a: {} }, { a: [] });
		expect(r.equal).toBe(false);
		expect(at(r.differences, 'root.a')!.kind).toBe('type-changed');
	});

	it('number vs string is a type change', () => {
		const r = diffJson({ a: 1 }, { a: '1' });
		expect(at(r.differences, 'root.a')!.kind).toBe('type-changed');
	});

	it('object vs scalar is a type change', () => {
		const r = diffJson({ a: { nested: 1 } }, { a: 5 });
		const d = at(r.differences, 'root.a')!;
		expect(d.kind).toBe('type-changed');
		expect(d.before).toEqual({ nested: 1 });
		expect(d.after).toBe(5);
	});

	it('null vs object is a type change', () => {
		const r = diffJson({ a: null }, { a: { x: 1 } });
		expect(at(r.differences, 'root.a')!.kind).toBe('type-changed');
	});
});

describe('diffJson — object key add / remove', () => {
	it('key only on right is "added"', () => {
		const r = diffJson({ a: 1 }, { a: 1, b: 2 });
		expect(r.equal).toBe(false);
		const d = at(r.differences, 'root.b')!;
		expect(d.kind).toBe('added');
		expect(d.after).toBe(2);
		expect('before' in d).toBe(false);
	});

	it('key only on left is "removed"', () => {
		const r = diffJson({ a: 1, b: 2 }, { a: 1 });
		expect(r.equal).toBe(false);
		const d = at(r.differences, 'root.b')!;
		expect(d.kind).toBe('removed');
		expect(d.before).toBe(2);
		expect('after' in d).toBe(false);
	});

	it('recurses into a key present in both with a nested change', () => {
		const r = diffJson({ user: { name: 'a', age: 1 } }, { user: { name: 'b', age: 1 } });
		expect(r.equal).toBe(false);
		const d = at(r.differences, 'root.user.name')!;
		expect(d.kind).toBe('changed');
		expect(d.before).toBe('a');
		expect(d.after).toBe('b');
		// age unchanged → no entry for it
		expect(at(r.differences, 'root.user.age')).toBeUndefined();
	});

	it('reports add + remove + change together', () => {
		const r = diffJson({ keep: 1, drop: 2, change: 3 }, { keep: 1, change: 4, fresh: 5 });
		expect(at(r.differences, 'root.drop')!.kind).toBe('removed');
		expect(at(r.differences, 'root.fresh')!.kind).toBe('added');
		expect(at(r.differences, 'root.change')!.kind).toBe('changed');
		expect(at(r.differences, 'root.keep')).toBeUndefined();
	});
});

describe('diffJson — arrays (order-sensitive, index-wise)', () => {
	it('identical arrays are equal', () => {
		expect(diffJson([1, 2, 3], [1, 2, 3]).equal).toBe(true);
	});

	it('reordered arrays are NOT equal (order-sensitive)', () => {
		const r = diffJson([1, 2, 3], [3, 2, 1]);
		expect(r.equal).toBe(false);
		// index 0: 1 -> 3 changed; index 2: 3 -> 1 changed; index 1 unchanged
		expect(at(r.differences, 'root[0]')!.kind).toBe('changed');
		expect(at(r.differences, 'root[2]')!.kind).toBe('changed');
		expect(at(r.differences, 'root[1]')).toBeUndefined();
	});

	it('trailing extra elements on the right are "added" at those indices', () => {
		const r = diffJson([1, 2], [1, 2, 3, 4]);
		expect(r.equal).toBe(false);
		expect(at(r.differences, 'root[2]')!.kind).toBe('added');
		expect(at(r.differences, 'root[2]')!.after).toBe(3);
		expect(at(r.differences, 'root[3]')!.kind).toBe('added');
		expect(at(r.differences, 'root[3]')!.after).toBe(4);
	});

	it('trailing extra elements on the left are "removed" at those indices', () => {
		const r = diffJson([1, 2, 3, 4], [1, 2]);
		expect(at(r.differences, 'root[2]')!.kind).toBe('removed');
		expect(at(r.differences, 'root[2]')!.before).toBe(3);
		expect(at(r.differences, 'root[3]')!.kind).toBe('removed');
	});

	it('recurses into element objects by index', () => {
		const left = { roles: [{ name: 'a' }, { name: 'b' }] };
		const right = { roles: [{ name: 'a' }, { name: 'B' }] };
		const r = diffJson(left, right);
		const d = at(r.differences, 'root.roles[1].name')!;
		expect(d.kind).toBe('changed');
		expect(d.before).toBe('b');
		expect(d.after).toBe('B');
	});

	it('array element index-wise number value equality (1 vs 1.0)', () => {
		const left = parseJsonSafe('[1.0, 2.0]');
		const right = parseJsonSafe('[1, 2]');
		if (left.ok && right.ok) {
			expect(diffJson(left.value, right.value).equal).toBe(true);
		} else {
			throw new Error('fixtures must parse');
		}
	});
});

describe('diffJson — path notation', () => {
	it('uses root for the top-level value', () => {
		expect(at(diffJson(1, 2).differences, 'root')).toBeDefined();
	});

	it('uses dot keys and [index] for deep paths', () => {
		const left = { user: { roles: [{ name: 'x' }, { name: 'y' }] } };
		const right = { user: { roles: [{ name: 'x' }, { name: 'Z' }] } };
		const r = diffJson(left, right);
		expect(at(r.differences, 'root.user.roles[1].name')).toBeDefined();
	});
});

describe('diffJson — deep equality verdict on big-ish structures', () => {
	it('equal nested arrays-of-objects with reordered keys', () => {
		const left = { list: [{ a: 1, b: 2 }, { c: 3 }] };
		const right = { list: [{ b: 2, a: 1 }, { c: 3 }] };
		expect(diffJson(left, right).equal).toBe(true);
	});

	it('a single deep mismatch flips equal to false', () => {
		const left = { list: [{ a: 1, b: 2 }, { c: 3 }] };
		const right = { list: [{ b: 2, a: 1 }, { c: 4 }] };
		const r = diffJson(left, right);
		expect(r.equal).toBe(false);
		expect(at(r.differences, 'root.list[1].c')!.kind).toBe('changed');
	});
});
