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
