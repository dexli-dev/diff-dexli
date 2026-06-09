// Plaintext serialisation of the diff result — used by the share affordance
// (bar item 6) as the fallback when the encoded URL exceeds the 4096-byte
// share cap. Format is +/-/' '-prefixed unified-diff-ish for line mode and
// [- -]/{+ +}-bracketed inline-diff for word mode. Format is not specified
// by the bar; any plaintext that round-trips the rendered diff into a
// copy-pasteable form satisfies the "copy the diff result directly" affordance.

import { diffLines, diffWords } from './engine';
import { parseJsonSafe, diffJson } from './json';
import type { DiffMode } from '../url-state';

export function diffAsText(a: string, b: string, mode: DiffMode): string {
	if (mode === 'json') {
		return jsonAsText(a, b);
	}
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

/**
 * Plaintext fallback for JSON structural-diff mode. Parses both panes; if
 * either fails to parse, reports the per-pane parse error (mirroring the UI
 * guard). Otherwise emits the verdict line plus one line per difference.
 */
function jsonAsText(a: string, b: string): string {
	const left = parseJsonSafe(a);
	const right = parseJsonSafe(b);
	if (!left.ok || !right.ok) {
		const lines: string[] = [];
		if (!left.ok) lines.push(`left: invalid JSON — ${left.error}`);
		if (!right.ok) lines.push(`right: invalid JSON — ${right.error}`);
		return lines.join('\n');
	}
	const result = diffJson(left.value, right.value);
	if (result.equal) {
		return 'structurally equal';
	}
	const header = `${result.differences.length} difference${result.differences.length === 1 ? '' : 's'}`;
	const rows = result.differences.map((d) => {
		switch (d.kind) {
			case 'added':
				return `+ ${d.path}: ${fmt(d.after)}`;
			case 'removed':
				return `- ${d.path}: ${fmt(d.before)}`;
			case 'type-changed':
				return `~ ${d.path}: ${fmt(d.before)} (type) -> ${fmt(d.after)}`;
			default:
				return `~ ${d.path}: ${fmt(d.before)} -> ${fmt(d.after)}`;
		}
	});
	return [header, ...rows].join('\n');
}

/** Compact one-line JSON rendering of a value for the plaintext fallback. */
function fmt(value: unknown): string {
	try {
		return JSON.stringify(value);
	} catch {
		return String(value);
	}
}
