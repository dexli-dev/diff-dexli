import { describe, expect, it } from 'vitest';
import { PANE_BYTE_CAP, utf8ByteLength, withinPaneCap } from './cap';

describe('utf8ByteLength', () => {
	it('matches string length for ASCII', () => {
		expect(utf8ByteLength('hello')).toBe(5);
		expect(utf8ByteLength('')).toBe(0);
	});

	it('counts multi-byte Unicode by UTF-8 byte weight', () => {
		// 'é' is U+00E9 → 2 bytes in UTF-8
		expect(utf8ByteLength('é')).toBe(2);
		// '漢' is U+6F22 → 3 bytes in UTF-8
		expect(utf8ByteLength('漢')).toBe(3);
		// '🚀' is U+1F680 → 4 bytes in UTF-8
		expect(utf8ByteLength('🚀')).toBe(4);
	});
});

describe('PANE_BYTE_CAP', () => {
	it('is 100 KiB (102400 bytes) per bar item 9', () => {
		expect(PANE_BYTE_CAP).toBe(102400);
	});
});

describe('withinPaneCap', () => {
	it('accepts content at exactly the cap', () => {
		expect(withinPaneCap('a'.repeat(PANE_BYTE_CAP))).toBe(true);
	});

	it('refuses content one byte over the cap', () => {
		expect(withinPaneCap('a'.repeat(PANE_BYTE_CAP + 1))).toBe(false);
	});

	it('refuses content where Unicode byte weight pushes it over', () => {
		// Just under cap in codepoints, but each '漢' is 3 bytes → over cap
		const text = '漢'.repeat(PANE_BYTE_CAP);
		expect(withinPaneCap(text)).toBe(false);
	});

	it('accepts empty string', () => {
		expect(withinPaneCap('')).toBe(true);
	});
});
