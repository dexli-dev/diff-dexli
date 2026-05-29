// Classic LCS DP shared by both line-mode and word-mode diff engines.
// Returns a flat operation list (`equal` / `add` / `remove`) per token.
//
// Cell budget per bar item 9 ("no unbounded computation"): when
// `a.length * b.length` exceeds `MAX_LCS_CELLS`, the function returns
// `null` and the caller surfaces a clear "too large" state rather than
// freezing the browser. ~2M cells = ~8MB Int32Array, ~milliseconds on
// modern hardware; gives ~1400×1400 sequence budget which covers all
// reasonable v1 inputs.

import type { DiffOpKind } from './types';

export const MAX_LCS_CELLS = 2_000_000;

export interface TokenOp {
	kind: DiffOpKind;
	text: string;
}

/**
 * LCS-based diff of two token arrays. Compares by string equality.
 * Returns the operation list in forward order, or `null` if the cell
 * budget would be exceeded.
 */
export function diffTokens(a: readonly string[], b: readonly string[]): TokenOp[] | null {
	const m = a.length;
	const n = b.length;

	if (m === 0 && n === 0) return [];
	if (m === 0) return b.map((text) => ({ kind: 'add' as const, text }));
	if (n === 0) return a.map((text) => ({ kind: 'remove' as const, text }));

	if (m * n > MAX_LCS_CELLS) return null;

	const W = n + 1;
	const dp = new Int32Array((m + 1) * W);
	for (let i = 1; i <= m; i++) {
		const rowAbove = (i - 1) * W;
		const rowHere = i * W;
		const ai = a[i - 1];
		for (let j = 1; j <= n; j++) {
			if (ai === b[j - 1]) {
				dp[rowHere + j] = dp[rowAbove + (j - 1)] + 1;
			} else {
				const up = dp[rowAbove + j];
				const left = dp[rowHere + (j - 1)];
				dp[rowHere + j] = up >= left ? up : left;
			}
		}
	}

	const ops: TokenOp[] = [];
	let i = m;
	let j = n;
	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
			ops.push({ kind: 'equal', text: a[i - 1] });
			i--;
			j--;
		} else if (j > 0 && (i === 0 || dp[i * W + (j - 1)] >= dp[(i - 1) * W + j])) {
			ops.push({ kind: 'add', text: b[j - 1] });
			j--;
		} else {
			ops.push({ kind: 'remove', text: a[i - 1] });
			i--;
		}
	}
	ops.reverse();
	return ops;
}
