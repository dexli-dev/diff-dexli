// Public engine entry-points. Two modes:
//   - `diffLines(a, b)` → row-aligned line-mode diff, with inline word-level
//     highlights inside changed line pairs (bar item 3b).
//   - `diffWords(a, b)` → token-level word-mode diff, two-column text flow.
// Both return `null` when the LCS DP cell budget would be exceeded.

import { diffTokens, type TokenOp } from './lcs';
import type { LineDiffResult, LineDiffRow, SpanRun, WordDiffResult } from './types';

/**
 * Tokenize text into words and whitespace runs. The whitespace boundaries
 * are preserved as their own tokens so the original text reconstructs
 * verbatim from the token stream. ASCII-whitespace boundary — sufficient
 * for the v1 cap (100 KB per pane) of mostly-Latin content; Unicode
 * codepoints inside words stay attached to their word token and diff
 * correctly via string equality.
 */
export function tokenizeWords(text: string): string[] {
	if (text === '') return [];
	return text.split(/(\s+)/).filter((t) => t !== '');
}

/**
 * Split text into lines. Preserves empty-line semantics:
 *   - ''      → []
 *   - 'a'     → ['a']
 *   - 'a\n'   → ['a']   (trailing newline doesn't create a phantom row)
 *   - 'a\nb'  → ['a', 'b']
 */
export function splitLines(text: string): string[] {
	if (text === '') return [];
	const lines = text.split('\n');
	if (lines.length > 0 && lines[lines.length - 1] === '') {
		lines.pop();
	}
	return lines;
}

/**
 * Word-mode diff. Tokenizes both inputs, runs LCS, and emits two parallel
 * span streams for the two panes:
 *   - leftSpans: every `equal` + `remove` op in source order
 *   - rightSpans: every `equal` + `add` op in source order
 * Empty inputs are handled directly (no LCS pass) so the empty-on-one-side
 * edge case from bar item 5 is fast + obvious.
 */
export function diffWords(a: string, b: string): WordDiffResult {
	const tokensA = tokenizeWords(a);
	const tokensB = tokenizeWords(b);
	const ops = diffTokens(tokensA, tokensB);
	if (ops === null) return null;
	return collectWordSpans(ops);
}

function collectWordSpans(ops: TokenOp[]): WordDiffResult {
	const leftSpans: SpanRun[] = [];
	const rightSpans: SpanRun[] = [];
	for (const op of ops) {
		if (op.kind === 'equal') {
			leftSpans.push({ kind: 'equal', text: op.text });
			rightSpans.push({ kind: 'equal', text: op.text });
		} else if (op.kind === 'remove') {
			leftSpans.push({ kind: 'remove', text: op.text });
		} else {
			rightSpans.push({ kind: 'add', text: op.text });
		}
	}
	return { leftSpans, rightSpans };
}

/**
 * Line-mode diff. Splits both inputs into lines, runs LCS, then walks the
 * op stream emitting visual rows. Consecutive `remove`+`add` pairs are
 * aligned into `changed-pair` rows with inline word-level highlights so
 * bar item 3b ("within changed lines, word-level differences highlighted
 * inline") holds without a second top-level diff pass.
 */
export function diffLines(a: string, b: string): LineDiffResult {
	const linesA = splitLines(a);
	const linesB = splitLines(b);
	const ops = diffTokens(linesA, linesB);
	if (ops === null) return null;
	return assembleLineRows(ops);
}

function assembleLineRows(ops: TokenOp[]): LineDiffRow[] {
	const rows: LineDiffRow[] = [];
	// `pendingRemovals` queues `remove` ops whose pair (an immediately-
	// following `add`) might still arrive. Each `add` consumes the oldest
	// pending removal (1:1 pairing); any leftover removals at the end of
	// the hunk emit as `removed-only` rows.
	const pendingRemovals: string[] = [];

	function flushRemovals(): void {
		while (pendingRemovals.length > 0) {
			const removed = pendingRemovals.shift()!;
			rows.push({
				kind: 'removed-only',
				left: [{ kind: 'remove', text: removed }],
				right: null
			});
		}
	}

	for (const op of ops) {
		if (op.kind === 'remove') {
			pendingRemovals.push(op.text);
		} else if (op.kind === 'add') {
			if (pendingRemovals.length > 0) {
				const removed = pendingRemovals.shift()!;
				const inline = inlineWordSpans(removed, op.text);
				rows.push({
					kind: 'changed-pair',
					left: inline.left,
					right: inline.right
				});
			} else {
				rows.push({
					kind: 'added-only',
					left: null,
					right: [{ kind: 'add', text: op.text }]
				});
			}
		} else {
			// `equal` — drain any unpaired removals first (a hunk boundary)
			flushRemovals();
			rows.push({
				kind: 'equal',
				left: [{ kind: 'equal', text: op.text }],
				right: [{ kind: 'equal', text: op.text }]
			});
		}
	}
	// End-of-stream: flush any remaining removals.
	flushRemovals();
	return rows;
}

/**
 * Word-level inline diff between two changed lines. Mirrors `diffWords`
 * but always succeeds for line-length inputs (bounded — single-line LCS
 * cell counts are well under MAX_LCS_CELLS).
 */
function inlineWordSpans(
	leftLine: string,
	rightLine: string
): { left: SpanRun[]; right: SpanRun[] } {
	const result = diffWords(leftLine, rightLine);
	if (result === null) {
		// Fallback: treat the whole line as a non-word-aligned change.
		return {
			left: [{ kind: 'remove', text: leftLine }],
			right: [{ kind: 'add', text: rightLine }]
		};
	}
	return { left: result.leftSpans, right: result.rightSpans };
}
