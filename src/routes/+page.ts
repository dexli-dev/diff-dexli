// Initial state hydration for diff.dexli.dev — bar items 1 + 4 + 6.
//
// Two paths:
//   - URL has `a` / `b` / `mode` params → hydrate from URL (item 4 / 6:
//     a shared link restores content + mode in a fresh private tab).
//   - URL has no diff params           → load with sample content so
//     first-load shows a working diff without user action (item 1).
//
// `prerender = false` because the load output varies with `?a=&b=&mode=`
// query params at request time. Adapter-node handles this natively.

import type { PageLoad } from './$types';
import { readUrlState } from '$lib/url-state';

export const prerender = false;

// Pre-populated sample content for first-load (item 1). Tech-prose-shape —
// not publication-shape. Demonstrates: identical context lines, one changed
// line with a word-level change inside (item 3a + 3b coverage on first paint).
const SAMPLE_A = `function parseQuery(input) {
  const params = new URLSearchParams(input);
  return Object.fromEntries(params);
}`;

const SAMPLE_B = `function parseQuery(input) {
  const params = new URLSearchParams(input);
  return Object.fromEntries(params.entries());
}`;

export const load: PageLoad = ({ url }) => {
	const hasDiffParams =
		url.searchParams.has('a') ||
		url.searchParams.has('b') ||
		url.searchParams.has('mode');

	if (hasDiffParams) {
		const state = readUrlState(url);
		return { initial: state, fromSample: false };
	}

	return {
		initial: { a: SAMPLE_A, b: SAMPLE_B, mode: 'line' as const },
		fromSample: true
	};
};
