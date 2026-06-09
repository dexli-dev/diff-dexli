// Public types for the diff engine — used by both the engine (`./engine.ts`)
// and the UI components that render the engine's output.

export type DiffOpKind = 'equal' | 'add' | 'remove';

/**
 * A run of identical-kind tokens emitted by the engine. The granularity
 * (line vs word) depends on which engine entry-point produced it.
 */
export interface SpanRun {
	kind: DiffOpKind;
	text: string;
}

/**
 * Line-mode diff: one row per visual row in the side-by-side rendering.
 * `left`/`right` are span-runs to render in each column; `null` = blank
 * placeholder for the column whose line doesn't exist in this row.
 */
export interface LineDiffRow {
	kind: 'equal' | 'removed-only' | 'added-only' | 'changed-pair';
	left: SpanRun[] | null;
	right: SpanRun[] | null;
}

/**
 * Word-mode diff: a flat stream of span-runs per pane. The left pane shows
 * the original `a` text with `equal` + `remove` spans; the right pane shows
 * the original `b` text with `equal` + `add` spans.
 */
export interface WordDiff {
	leftSpans: SpanRun[];
	rightSpans: SpanRun[];
}

/**
 * Engine returns `null` for inputs whose LCS DP would exceed the cell
 * budget. UI surfaces this as a "too large to diff at this size" state
 * rather than silently truncating or freezing. Bar item 9: no unbounded
 * computation, no silent truncation.
 */
export type LineDiffResult = LineDiffRow[] | null;
export type WordDiffResult = WordDiff | null;

// ─── JSON structural-diff mode ──────────────────────────────────────────────
// A separate, recursive structural comparison (no LCS). Object keys compared
// order-ignoring by key-set; arrays compared order-sensitively by index;
// numbers compared by parsed value. Produced by `diffJson` in `./json.ts`.

/**
 * One structural difference between two parsed JSON values.
 *   - `added`        — key/index present only on the right (`after` set).
 *   - `removed`      — key/index present only on the left (`before` set).
 *   - `changed`      — same type on both sides, but unequal scalar value
 *                      (`before` + `after` set).
 *   - `type-changed` — the two values have different JSON types at this path
 *                      (`before` + `after` set).
 * `path` is the JSON-path string of the node, e.g. `root.user.roles[2].name`.
 * `before`/`after` are only present when meaningful for the kind (see above),
 * so callers can use `'before' in diff` / `'after' in diff` to discriminate.
 */
export interface JsonDifference {
	path: string;
	kind: 'added' | 'removed' | 'changed' | 'type-changed';
	before?: unknown;
	after?: unknown;
}

/**
 * Result of `diffJson`. `equal` is the verdict (true ⇔ `differences` empty);
 * `differences` is the flat list of all structural differences found, in
 * deterministic traversal order.
 */
export interface JsonDiffResult {
	equal: boolean;
	differences: JsonDifference[];
}
