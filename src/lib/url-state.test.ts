// Unit tests for the URL state contract. Belongs at the src/** level so
// vite.config.ts's scaffold-domain test-include glob picks it up without
// engineer-domain config touching.

import { describe, expect, it } from 'vitest';
import {
	DEFAULT_MODE,
	DIFF_MODES,
	isDiffMode,
	readUrlState,
	writeUrlState,
	type DiffState
} from './url-state';

describe('readUrlState', () => {
	it('returns defaults for an empty URLSearchParams', () => {
		const state = readUrlState(new URLSearchParams());
		expect(state).toEqual({ a: '', b: '', mode: DEFAULT_MODE });
	});

	it('reads a, b, mode from URLSearchParams', () => {
		const params = new URLSearchParams({ a: 'left', b: 'right', mode: 'word' });
		expect(readUrlState(params)).toEqual({ a: 'left', b: 'right', mode: 'word' });
	});

	it('accepts a URL and reads from its searchParams', () => {
		const url = new URL('https://diff.dexli.dev/?a=L&b=R&mode=line');
		expect(readUrlState(url)).toEqual({ a: 'L', b: 'R', mode: 'line' });
	});

	it('falls back to DEFAULT_MODE for unknown mode value', () => {
		const params = new URLSearchParams({ a: '', b: '', mode: 'char' });
		expect(readUrlState(params).mode).toBe(DEFAULT_MODE);
	});

	it('falls back to empty string for missing a / b', () => {
		expect(readUrlState(new URLSearchParams({ mode: 'word' })).a).toBe('');
		expect(readUrlState(new URLSearchParams({ mode: 'word' })).b).toBe('');
	});

	it('preserves empty-string a / b explicitly passed', () => {
		const state = readUrlState(new URLSearchParams({ a: '', b: 'x' }));
		expect(state.a).toBe('');
		expect(state.b).toBe('x');
	});

	it('preserves multiline content with newlines verbatim', () => {
		const a = 'line1\nline2\nline3';
		const b = 'line1\nLINE2\nline3';
		const params = new URLSearchParams({ a, b });
		expect(readUrlState(params)).toEqual({ a, b, mode: DEFAULT_MODE });
	});

	it('round-trips non-ASCII Unicode (incl. emoji) via URLSearchParams', () => {
		const a = 'café — 漢字 — 🚀';
		const b = 'café — 漢字 — 🐢';
		const params = new URLSearchParams({ a, b });
		const decoded = readUrlState(params);
		expect(decoded.a).toBe(a);
		expect(decoded.b).toBe(b);
	});

	it('never throws on duplicate keys (URLSearchParams keeps first)', () => {
		const params = new URLSearchParams();
		params.append('a', 'first');
		params.append('a', 'second');
		expect(readUrlState(params).a).toBe('first');
	});

	it('treats absent mode as DEFAULT_MODE', () => {
		expect(readUrlState(new URLSearchParams({ a: 'x' })).mode).toBe(DEFAULT_MODE);
	});
});

describe('writeUrlState', () => {
	it('omits empty a, empty b, and default mode (defaults → empty query)', () => {
		const state: DiffState = { a: '', b: '', mode: DEFAULT_MODE };
		expect(writeUrlState(state).toString()).toBe('');
	});

	it('emits a, b when non-empty', () => {
		const params = writeUrlState({ a: 'left', b: 'right', mode: DEFAULT_MODE });
		expect(params.get('a')).toBe('left');
		expect(params.get('b')).toBe('right');
		expect(params.has('mode')).toBe(false);
	});

	it('emits mode when non-default', () => {
		const params = writeUrlState({ a: '', b: '', mode: 'word' });
		expect(params.get('mode')).toBe('word');
		expect(params.has('a')).toBe(false);
		expect(params.has('b')).toBe(false);
	});

	it('preserves multiline a / b verbatim (newlines percent-encoded)', () => {
		const a = 'one\ntwo\nthree';
		const params = writeUrlState({ a, b: '', mode: DEFAULT_MODE });
		expect(params.get('a')).toBe(a);
		// And the encoded string uses %0A for newline (URLSearchParams behavior)
		expect(params.toString()).toMatch(/%0A/);
	});

	it('preserves Unicode through URLSearchParams percent-encoding', () => {
		const a = '漢字 🚀';
		const params = writeUrlState({ a, b: '', mode: DEFAULT_MODE });
		expect(params.get('a')).toBe(a);
		expect(params.toString()).toMatch(/%[0-9A-F]{2}/i);
	});
});

describe('round-trip readUrlState(writeUrlState(...))', () => {
	const cases: DiffState[] = [
		{ a: '', b: '', mode: 'line' },
		{ a: 'L', b: 'R', mode: 'line' },
		{ a: 'L', b: 'R', mode: 'word' },
		{ a: 'multi\nline\ncontent', b: 'other\ncontent', mode: 'word' },
		{ a: 'café 漢字 🚀', b: '!@#$%^&*()=+/?', mode: 'line' },
		{ a: 'a'.repeat(2048), b: 'b'.repeat(2048), mode: 'word' },
		{ a: '   leading + trailing   ', b: '\t\nweird chars\r', mode: 'line' }
	];

	it.each(cases)('round-trips %j', (state) => {
		const decoded = readUrlState(writeUrlState(state));
		expect(decoded).toEqual(state);
	});
});

describe('isDiffMode type-guard', () => {
	it.each(DIFF_MODES)('returns true for valid mode %s', (mode) => {
		expect(isDiffMode(mode)).toBe(true);
	});

	it.each(['char', 'CHAR', 'Line', '', 'wordy', ' line '])(
		'returns false for invalid string %j',
		(s) => {
			expect(isDiffMode(s)).toBe(false);
		}
	);

	it('returns false for null', () => {
		expect(isDiffMode(null)).toBe(false);
	});
});

describe('DEFAULT_MODE invariants', () => {
	it('is one of DIFF_MODES', () => {
		expect((DIFF_MODES as readonly string[]).includes(DEFAULT_MODE)).toBe(true);
	});

	it('is "line" per bar product call 1 (line is default)', () => {
		expect(DEFAULT_MODE).toBe('line');
	});
});
