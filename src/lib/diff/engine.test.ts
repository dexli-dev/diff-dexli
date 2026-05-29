// Engine unit tests covering line + word diff + edge cases per bar item 5.

import { describe, expect, it } from 'vitest';
import { diffLines, diffWords, splitLines, tokenizeWords } from './engine';

describe('tokenizeWords', () => {
	it('returns empty array for empty string', () => {
		expect(tokenizeWords('')).toEqual([]);
	});

	it('splits on whitespace boundaries, preserving whitespace tokens', () => {
		expect(tokenizeWords('hello world')).toEqual(['hello', ' ', 'world']);
		expect(tokenizeWords('a  b')).toEqual(['a', '  ', 'b']);
	});

	it('keeps a single token for a single word', () => {
		expect(tokenizeWords('hello')).toEqual(['hello']);
	});

	it('keeps Unicode word content as a single token', () => {
		expect(tokenizeWords('café')).toEqual(['café']);
		expect(tokenizeWords('漢字')).toEqual(['漢字']);
	});
});

describe('splitLines', () => {
	it('returns empty array for empty string', () => {
		expect(splitLines('')).toEqual([]);
	});

	it('returns single line for single-line content', () => {
		expect(splitLines('hello')).toEqual(['hello']);
	});

	it('splits on \\n', () => {
		expect(splitLines('a\nb\nc')).toEqual(['a', 'b', 'c']);
	});

	it('does not emit phantom row for trailing newline', () => {
		expect(splitLines('a\n')).toEqual(['a']);
		expect(splitLines('a\nb\n')).toEqual(['a', 'b']);
	});

	it('preserves empty intermediate lines', () => {
		expect(splitLines('a\n\nb')).toEqual(['a', '', 'b']);
	});
});

describe('diffWords', () => {
	it('produces all-equal spans for identical inputs', () => {
		const r = diffWords('hello world', 'hello world')!;
		expect(r.leftSpans.every((s) => s.kind === 'equal')).toBe(true);
		expect(r.rightSpans.every((s) => s.kind === 'equal')).toBe(true);
		expect(r.leftSpans.map((s) => s.text).join('')).toBe('hello world');
	});

	it('marks add-only when left empty', () => {
		const r = diffWords('', 'hello')!;
		expect(r.leftSpans).toEqual([]);
		expect(r.rightSpans).toEqual([{ kind: 'add', text: 'hello' }]);
	});

	it('marks remove-only when right empty', () => {
		const r = diffWords('hello', '')!;
		expect(r.leftSpans).toEqual([{ kind: 'remove', text: 'hello' }]);
		expect(r.rightSpans).toEqual([]);
	});

	it('returns empty spans for both inputs empty (bar item 5)', () => {
		const r = diffWords('', '')!;
		expect(r.leftSpans).toEqual([]);
		expect(r.rightSpans).toEqual([]);
	});

	it('highlights only the changed word in a one-word change', () => {
		const r = diffWords('hello world', 'hello universe')!;
		const leftChanges = r.leftSpans.filter((s) => s.kind === 'remove');
		const rightChanges = r.rightSpans.filter((s) => s.kind === 'add');
		expect(leftChanges).toEqual([{ kind: 'remove', text: 'world' }]);
		expect(rightChanges).toEqual([{ kind: 'add', text: 'universe' }]);
	});

	it('handles non-ASCII Unicode word tokens', () => {
		const r = diffWords('hello café', 'hello restaurant')!;
		expect(r.leftSpans.some((s) => s.kind === 'remove' && s.text === 'café')).toBe(true);
		expect(r.rightSpans.some((s) => s.kind === 'add' && s.text === 'restaurant')).toBe(true);
	});

	it('reconstructs original text from leftSpans / rightSpans (round-trip)', () => {
		const a = 'the quick brown fox jumps';
		const b = 'the slow brown fox runs';
		const r = diffWords(a, b)!;
		expect(r.leftSpans.map((s) => s.text).join('')).toBe(a);
		expect(r.rightSpans.map((s) => s.text).join('')).toBe(b);
	});
});

describe('diffLines', () => {
	it('produces all-equal rows for identical inputs (bar item 5)', () => {
		const rows = diffLines('a\nb\nc', 'a\nb\nc')!;
		expect(rows.length).toBe(3);
		expect(rows.every((r) => r.kind === 'equal')).toBe(true);
	});

	it('handles both-empty as zero rows (bar item 5)', () => {
		expect(diffLines('', '')).toEqual([]);
	});

	it('whole right as added when left empty (bar item 5)', () => {
		const rows = diffLines('', 'a\nb')!;
		expect(rows.length).toBe(2);
		expect(rows.every((r) => r.kind === 'added-only')).toBe(true);
		expect(rows[0].left).toBeNull();
	});

	it('whole left as removed when right empty (bar item 5)', () => {
		const rows = diffLines('a\nb', '')!;
		expect(rows.length).toBe(2);
		expect(rows.every((r) => r.kind === 'removed-only')).toBe(true);
		expect(rows[0].right).toBeNull();
	});

	it('pairs a remove+add into a changed-pair row with inline highlights', () => {
		const rows = diffLines('hello world', 'hello universe')!;
		expect(rows.length).toBe(1);
		expect(rows[0].kind).toBe('changed-pair');
		const leftSpans = rows[0].left!;
		const rightSpans = rows[0].right!;
		expect(leftSpans.some((s) => s.kind === 'remove' && s.text === 'world')).toBe(true);
		expect(rightSpans.some((s) => s.kind === 'add' && s.text === 'universe')).toBe(true);
	});

	it('emits removed-only + added-only when removals and additions are unbalanced', () => {
		const rows = diffLines('a\nb', 'a\nb\nc\nd')!;
		const added = rows.filter((r) => r.kind === 'added-only');
		expect(added.length).toBe(2);
		expect(added.map((r) => (r.right![0] as { text: string }).text)).toEqual(['c', 'd']);
	});

	it('handles single-very-long-line with no newlines (bar item 5)', () => {
		const a = 'word '.repeat(500).trim();
		const b = 'word '.repeat(500).trim() + ' extra';
		const rows = diffLines(a, b)!;
		expect(rows.length).toBe(1);
		expect(rows[0].kind).toBe('changed-pair');
	});

	it('handles non-ASCII Unicode (incl. emoji) in line content (bar item 5)', () => {
		const a = 'hello café\n漢字 line\n🚀 rocket';
		const b = 'hello café\n漢字 LINE\n🚀 rocket';
		const rows = diffLines(a, b)!;
		expect(rows.length).toBe(3);
		expect(rows[0].kind).toBe('equal');
		expect(rows[1].kind).toBe('changed-pair');
		expect(rows[2].kind).toBe('equal');
	});

	it('preserves empty intermediate lines correctly', () => {
		const a = 'a\n\nb';
		const b = 'a\n\nB';
		const rows = diffLines(a, b)!;
		expect(rows.length).toBe(3);
		expect(rows[0].kind).toBe('equal');
		expect(rows[1].kind).toBe('equal');
		expect(rows[2].kind).toBe('changed-pair');
	});
});

describe('engine cell-budget guard (bar item 9: no unbounded computation)', () => {
	it('returns null for inputs that would exceed MAX_LCS_CELLS', () => {
		// 1500 × 1500 = 2.25M cells > MAX_LCS_CELLS (2M)
		const a = Array.from({ length: 1500 }, (_, i) => `a${i}`).join('\n');
		const b = Array.from({ length: 1500 }, (_, i) => `b${i}`).join('\n');
		expect(diffLines(a, b)).toBeNull();
	});

	it('completes for inputs within budget', () => {
		const a = Array.from({ length: 100 }, (_, i) => `line${i}`).join('\n');
		const b = Array.from({ length: 100 }, (_, i) => `line${i}-changed`).join('\n');
		const rows = diffLines(a, b);
		expect(rows).not.toBeNull();
	});
});
