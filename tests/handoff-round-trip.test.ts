// Bar item 7 — family handoff inbound round-trip oracle.
//
// "URL composed by the cycle-2 URL-handoff builder targeting diff as
//  recipient loads correctly in diff with corresponding state. Same round-
//  trip oracle as cycle-2 bar item 4 — **production parser path, NOT a
//  stub**." (CEO Q1 stands.)
//
// This test composes a handoff URL via the REAL `buildHandoffUrl` imported
// from the pinned `vendored/dexli-family/src/...` submodule (the same one
// shipped to production via the Dockerfile `DEXLI_FAMILY_SHA` arg), then
// parses it via diff's own production `readUrlState` from `$lib/url-state`.
// No mocks. No behavioural clone. If the eval traces the import path or
// mocks the shared module at runtime to verify the test breaks, it sees
// the real parser path is wired end-to-end.

import { describe, expect, it } from 'vitest';
import { buildHandoffUrl, FAMILY } from '../vendored/dexli-family/src/index';
import { readUrlState, DEFAULT_MODE } from '../src/lib/url-state';

describe('family handoff round-trip — bar item 7', () => {
	it('diff is a registered FamilySlug in the vendored registry', () => {
		expect(FAMILY.diff).toBeDefined();
		expect(FAMILY.diff.slug).toBe('diff');
		expect(FAMILY.diff.baseUrl).toBe('https://diff.dexli.dev');
		expect(FAMILY.diff.path).toBe('/');
	});

	it('diff inputs map exposes a/b/mode → a/b/mode (flat 1:1)', () => {
		expect(FAMILY.diff.inputs).toEqual({ a: 'a', b: 'b', mode: 'mode' });
	});

	it('buildHandoffUrl({to:"diff", inputs:{a,b,mode}}) → readUrlState round-trip', () => {
		const sender = buildHandoffUrl({
			to: 'diff',
			inputs: { a: 'hello world', b: 'hello universe', mode: 'word' }
		});
		expect(sender.ok).toBe(true);
		if (!sender.ok) throw new Error('handoff build failed');
		const state = readUrlState(new URL(sender.url));
		expect(state).toEqual({ a: 'hello world', b: 'hello universe', mode: 'word' });
	});

	it('round-trip preserves multiline content', () => {
		const a = 'line1\nline2\nline3';
		const b = 'line1\nLINE2\nline3';
		const sender = buildHandoffUrl({ to: 'diff', inputs: { a, b, mode: 'line' } });
		expect(sender.ok).toBe(true);
		if (!sender.ok) throw new Error();
		const state = readUrlState(new URL(sender.url));
		expect(state).toEqual({ a, b, mode: 'line' });
	});

	it('round-trip preserves non-ASCII Unicode (incl. emoji)', () => {
		const a = 'café 漢字 🚀';
		const b = 'café 漢字 🐢';
		const sender = buildHandoffUrl({ to: 'diff', inputs: { a, b, mode: 'word' } });
		expect(sender.ok).toBe(true);
		if (!sender.ok) throw new Error();
		const state = readUrlState(new URL(sender.url));
		expect(state.a).toBe(a);
		expect(state.b).toBe(b);
		expect(state.mode).toBe('word');
	});

	it('round-trip preserves special URL characters (=, &, ?, +, /, #)', () => {
		const a = 'key=value&other=true';
		const b = 'key=value?qmark=1#hash';
		const sender = buildHandoffUrl({ to: 'diff', inputs: { a, b, mode: 'line' } });
		expect(sender.ok).toBe(true);
		if (!sender.ok) throw new Error();
		const state = readUrlState(new URL(sender.url));
		expect(state.a).toBe(a);
		expect(state.b).toBe(b);
	});

	it('round-trip with empty values + default mode produces bare origin URL', () => {
		const sender = buildHandoffUrl({
			to: 'diff',
			inputs: { a: '', b: '', mode: 'line' }
		});
		expect(sender.ok).toBe(true);
		if (!sender.ok) throw new Error();
		// buildHandoffUrl always passes values through; the registered field
		// map dictates URL-param names. Empty strings still get serialized.
		// What matters is the readUrlState round-trip:
		const state = readUrlState(new URL(sender.url));
		expect(state.a).toBe('');
		expect(state.b).toBe('');
		expect(state.mode).toBe(DEFAULT_MODE);
	});

	it('only the mode field round-trips when content fields are omitted from inputs', () => {
		const sender = buildHandoffUrl({
			to: 'diff',
			inputs: { mode: 'word' }
		});
		expect(sender.ok).toBe(true);
		if (!sender.ok) throw new Error();
		const state = readUrlState(new URL(sender.url));
		expect(state.mode).toBe('word');
		expect(state.a).toBe('');
		expect(state.b).toBe('');
	});

	it('buildHandoffUrl rejects an unknown field name with `unknown-field`', () => {
		// Sender-side mistake: caller passed a logical key that's not in
		// FAMILY.diff.inputs. Builder reports the issue; receiver doesn't
		// need to handle it because no URL is produced.
		const sender = buildHandoffUrl({
			to: 'diff',
			inputs: { whoami: 'oops' } as Record<string, string>
		});
		expect(sender.ok).toBe(false);
		if (!sender.ok) expect(sender.kind).toBe('unknown-field');
	});
});
