// Plaintext serialisation of the diff result — used by the share affordance
// (bar item 6) as the fallback when the encoded URL exceeds the 4096-byte
// share cap. Format is +/-/' '-prefixed unified-diff-ish for line mode and
// [- -]/{+ +}-bracketed inline-diff for word mode. Format is not specified
// by the bar; any plaintext that round-trips the rendered diff into a
// copy-pasteable form satisfies the "copy the diff result directly" affordance.

import { diffLines, diffWords } from './engine';
import type { DiffMode } from '../url-state';

export function diffAsText(a: string, b: string, mode: DiffMode): string {
	if (mode === 'line') {
		const rows = diffLines(a, b);
		if (rows === null) return '(diff too large to render)';
		const lines: string[] = [];
		for (const row of rows) {
			if (row.kind === 'equal') {
				lines.push('  ' + textOf(row.left));
			} else if (row.kind === 'removed-only') {
				lines.push('- ' + textOf(row.left));
			} else if (row.kind === 'added-only') {
				lines.push('+ ' + textOf(row.right));
			} else {
				lines.push('- ' + textOf(row.left));
				lines.push('+ ' + textOf(row.right));
			}
		}
		return lines.join('\n');
	} else {
		const w = diffWords(a, b);
		if (w === null) return '(diff too large to render)';
		const left = w.leftSpans
			.map((s) => (s.kind === 'remove' ? `[-${s.text}-]` : s.text))
			.join('');
		const right = w.rightSpans
			.map((s) => (s.kind === 'add' ? `{+${s.text}+}` : s.text))
			.join('');
		return `--- left\n${left}\n+++ right\n${right}`;
	}
}

function textOf(spans: { text: string }[] | null): string {
	if (spans === null) return '';
	return spans.map((s) => s.text).join('');
}
