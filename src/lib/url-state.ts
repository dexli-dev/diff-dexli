// URL state contract for diff.dexli.dev — bar item 4 (own-URL state) and
// the receiver-side of item 7 (the production parser path that the
// dexli-family `buildHandoffUrl({ to: 'diff', ... })` builds against).
//
// Per bar product call 5 — URL share scope is exactly:
//   a    — left pane contents  (UTF-8 string)
//   b    — right pane contents (UTF-8 string)
//   mode — 'line' (default) | 'word'
//
// Explicitly NOT in URL: scroll position, viewport size, UI theme.
//
// Contract guarantees (CEO Q1: production parser path, not a stub):
//   - `readUrlState()` never throws on any URLSearchParams input — invalid
//     mode falls back to DEFAULT_MODE; missing values fall back to defaults.
//   - `writeUrlState()` omits empty 'a'/'b' and the default mode so a
//     fresh-load URL is unadorned (`https://diff.dexli.dev/`) when state
//     is at defaults — keeps share URLs short for the empty-content case.
//   - Round-trip: `readUrlState(writeUrlState(s))` returns a state value-
//     equal to `s` for any well-formed DiffState (verified in tests).
//   - Empty strings semantically distinct from missing params at the
//     model level, but encode identically (both → omitted from URL).
//     This is intentional: the receiver pane is empty either way.

/**
 * The two diff modes the v1 bar enumerates. `line` is the default; `word`
 * is the alternative. char-level granularity skipped per product call 1.
 */
export const DIFF_MODES = ['line', 'word'] as const;

export type DiffMode = (typeof DIFF_MODES)[number];

export const DEFAULT_MODE: DiffMode = 'line';

export interface DiffState {
	a: string;
	b: string;
	mode: DiffMode;
}

/**
 * Decode a `DiffState` from URL search params. Accepts either a `URL` or a
 * raw `URLSearchParams`. Always returns a well-formed `DiffState`; no
 * exceptions thrown on malformed input.
 */
export function readUrlState(source: URL | URLSearchParams): DiffState {
	const params = source instanceof URL ? source.searchParams : source;
	const rawMode = params.get('mode');
	return {
		a: params.get('a') ?? '',
		b: params.get('b') ?? '',
		mode: isDiffMode(rawMode) ? rawMode : DEFAULT_MODE
	};
}

/**
 * Encode a `DiffState` to `URLSearchParams`. Empty `a` / `b` and the
 * default `mode` are omitted so the encoded query string is minimal at
 * defaults. The caller is responsible for joining onto a base URL +
 * enforcing the bar's 4096-byte total-URL cap (item 6).
 */
export function writeUrlState(state: DiffState): URLSearchParams {
	const params = new URLSearchParams();
	if (state.a !== '') params.set('a', state.a);
	if (state.b !== '') params.set('b', state.b);
	if (state.mode !== DEFAULT_MODE) params.set('mode', state.mode);
	return params;
}

/**
 * Type-guard: narrows `string | null` to `DiffMode`. Returns `false` for
 * `null` and for any string outside `DIFF_MODES`.
 */
export function isDiffMode(value: string | null): value is DiffMode {
	return value !== null && (DIFF_MODES as readonly string[]).includes(value);
}
