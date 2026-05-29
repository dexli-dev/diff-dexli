import { describe, expect, it } from 'vitest';
import { buildShareUrl, MAX_SHARE_URL_BYTES, SHARE_ORIGIN } from './share-url';
import { DEFAULT_MODE } from './url-state';

describe('buildShareUrl', () => {
	it('produces the bare origin for default state', () => {
		const r = buildShareUrl({ a: '', b: '', mode: DEFAULT_MODE });
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.url).toBe(`${SHARE_ORIGIN}/`);
		}
	});

	it('appends query string when state has non-default values', () => {
		const r = buildShareUrl({ a: 'L', b: 'R', mode: 'word' });
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.url).toMatch(/^https:\/\/diff\.dexli\.dev\/\?/);
			expect(r.url).toContain('a=L');
			expect(r.url).toContain('b=R');
			expect(r.url).toContain('mode=word');
		}
	});

	it('returns over-cap when total URL exceeds MAX_SHARE_URL_BYTES', () => {
		// Build a state whose URL well exceeds 4096 bytes.
		const big = 'x'.repeat(4096);
		const r = buildShareUrl({ a: big, b: big, mode: DEFAULT_MODE });
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.kind).toBe('over-cap');
			expect(r.cap).toBe(MAX_SHARE_URL_BYTES);
			expect(r.bytes).toBeGreaterThan(MAX_SHARE_URL_BYTES);
		}
	});

	it('admits content at the threshold boundary', () => {
		// Engineer the input so the resulting URL is just under the cap.
		// Bare origin is 22 bytes; query overhead for `a=` is 2 bytes.
		const overhead = `${SHARE_ORIGIN}/?a=`.length;
		const fillLen = MAX_SHARE_URL_BYTES - overhead;
		const r = buildShareUrl({ a: 'x'.repeat(fillLen), b: '', mode: DEFAULT_MODE });
		expect(r.ok).toBe(true);
	});

	it('counts UTF-8 byte weight, not codepoint length', () => {
		// 1300 × '🚀' = 1300 codepoints but 1300 × 4 percent-encoded bytes
		// would be ~12 bytes/codepoint after %F0%9F%9A%80 → 12 bytes each
		// → way over cap. Verifies the cap counts the encoded byte length.
		const r = buildShareUrl({ a: '🚀'.repeat(1300), b: '', mode: DEFAULT_MODE });
		expect(r.ok).toBe(false);
	});

	it('does not throw on edge inputs (control chars, whitespace)', () => {
		const r = buildShareUrl({ a: '\t\n\r', b: '   ', mode: 'word' });
		expect(r.ok).toBe(true);
	});
});
