<script lang="ts">
	// Diff output — branches on mode. Three top-level rendering paths:
	//   - line mode: row-aligned side-by-side with inline word-highlights
	//     inside changed pairs (bar item 3a + 3b).
	//   - word mode: text-flowed two-column with token-level highlights.
	//   - guard states: too-large, both-empty, no-changes, over-cap-on-either-pane.
	//
	// The diff computation is a `$derived` value that recomputes whenever
	// `a`, `b`, or `mode` changes. For inputs within the LCS cell budget
	// this is synchronous + sub-100ms; for inputs above the budget the
	// engine returns `null` and we surface the too-large state directly
	// instead of freezing the browser (bar item 9).

	import { diffLines, diffWords } from '$lib/diff/engine';
	import { parseJsonSafe, diffJson } from '$lib/diff/json';
	import type { LineDiffRow, SpanRun, WordDiff, JsonDiffResult } from '$lib/diff/types';
	import { PANE_BYTE_CAP, utf8ByteLength } from '$lib/diff/cap';
	import type { DiffMode } from '$lib/url-state';

	interface Props {
		a: string;
		b: string;
		mode: DiffMode;
	}

	let { a, b, mode }: Props = $props();

	const aBytes = $derived(utf8ByteLength(a));
	const bBytes = $derived(utf8ByteLength(b));
	const anyOverCap = $derived(aBytes > PANE_BYTE_CAP || bBytes > PANE_BYTE_CAP);
	const bothEmpty = $derived(a === '' && b === '');
	// In json mode the structural verdict banner ("structurally equal") covers
	// the identical case, so we only show the generic "No changes" banner for
	// the text modes.
	const identical = $derived(a === b && a !== '' && mode !== 'json');

	const lineResult = $derived.by(() => {
		if (anyOverCap || bothEmpty || identical || mode !== 'line') return null;
		return diffLines(a, b);
	});

	const wordResult = $derived.by(() => {
		if (anyOverCap || bothEmpty || identical || mode !== 'word') return null;
		return diffWords(a, b);
	});

	const diffTooLarge = $derived.by(() => {
		if (anyOverCap || bothEmpty || identical) return false;
		if (mode === 'line') return lineResult === null;
		if (mode === 'word') return wordResult === null;
		return false; // json mode does no LCS — never "too large" for the engine budget
	});

	// ── JSON mode: parse each pane independently, surface a per-pane error. ──
	const leftParse = $derived.by(() =>
		mode === 'json' && !anyOverCap && !bothEmpty ? parseJsonSafe(a) : null
	);
	const rightParse = $derived.by(() =>
		mode === 'json' && !anyOverCap && !bothEmpty ? parseJsonSafe(b) : null
	);
	const jsonError = $derived.by(() => {
		if (leftParse && !leftParse.ok) return { pane: 'left' as const, error: leftParse.error };
		if (rightParse && !rightParse.ok) return { pane: 'right' as const, error: rightParse.error };
		return null;
	});
	const jsonResult = $derived.by<JsonDiffResult | null>(() => {
		if (mode !== 'json' || anyOverCap || bothEmpty) return null;
		if (!leftParse || !leftParse.ok || !rightParse || !rightParse.ok) return null;
		return diffJson(leftParse.value, rightParse.value);
	});

	/** Compact one-line rendering of a JSON value for the differences list. */
	function jsonValue(value: unknown): string {
		try {
			return JSON.stringify(value) ?? String(value);
		} catch {
			return String(value);
		}
	}
</script>

<section class="diff-view" aria-label="Diff output">
	{#if anyOverCap}
		<div class="state-banner state-warn" role="status">
			Resolve the per-pane size cap to view the diff.
		</div>
	{:else if bothEmpty}
		<div class="state-banner state-info" role="status">
			Nothing to compare — paste content into either pane to begin.
		</div>
	{:else if identical}
		<div class="state-banner state-info" role="status">
			No changes — the two panes are identical.
		</div>
	{:else if diffTooLarge}
		<div class="state-banner state-warn" role="status">
			Diff too large to render at this size — try comparing smaller sections.
		</div>
	{:else if mode === 'json' && jsonError}
		<div class="state-banner state-warn" role="status">
			Invalid JSON in the {jsonError.pane} pane — {jsonError.error}
		</div>
	{:else if mode === 'json' && jsonResult}
		{@render jsonMode(jsonResult)}
	{:else if mode === 'line' && lineResult}
		{@render lineMode(lineResult)}
	{:else if mode === 'word' && wordResult}
		{@render wordMode(wordResult)}
	{/if}
</section>

{#snippet lineMode(rows: LineDiffRow[])}
	<div class="line-mode" role="table" aria-label="Line-mode diff">
		{#each rows as row, i (i)}
			<div class="row row-{row.kind}" role="row">
				<div class="col col-left" role="cell">
					{@render columnLine(row.left, row.kind === 'removed-only')}
				</div>
				<div class="col col-right" role="cell">
					{@render columnLine(row.right, row.kind === 'added-only')}
				</div>
			</div>
		{/each}
	</div>
{/snippet}

{#snippet columnLine(spans: SpanRun[] | null, isLoneMarker: boolean)}
	{#if spans === null}
		<span class="placeholder" aria-hidden="true">·</span>
	{:else}
		<span class="line-text" class:lone-marker={isLoneMarker}>
			{#each spans as span, i (i)}
				<span class="span span-{span.kind}">{span.text}</span>
			{/each}
		</span>
	{/if}
{/snippet}

{#snippet wordMode(result: WordDiff)}
	<div class="word-mode">
		<div class="col col-left" aria-label="Left source with removals highlighted">
			{#each result.leftSpans as span, i (i)}<span class="span span-{span.kind}">{span.text}</span>{/each}
		</div>
		<div class="col col-right" aria-label="Right source with additions highlighted">
			{#each result.rightSpans as span, i (i)}<span class="span span-{span.kind}">{span.text}</span>{/each}
		</div>
	</div>
{/snippet}

{#snippet jsonMode(result: JsonDiffResult)}
	<div class="json-mode">
		{#if result.equal}
			<div class="state-banner json-verdict json-verdict-equal" role="status">
				Structurally equal — the two JSON values match (key order ignored).
			</div>
		{:else}
			<div class="state-banner json-verdict json-verdict-diff" role="status">
				{result.differences.length}
				{result.differences.length === 1 ? 'difference' : 'differences'}
			</div>
			<ul class="json-diff-list" aria-label="Structural differences">
				{#each result.differences as diff, i (i)}
					<li class="json-diff json-diff-{diff.kind}">
						<span class="json-kind">{diff.kind}</span>
						<code class="json-path">{diff.path}</code>
						{#if diff.kind === 'added'}
							<code class="json-val json-after">{jsonValue(diff.after)}</code>
						{:else if diff.kind === 'removed'}
							<code class="json-val json-before">{jsonValue(diff.before)}</code>
						{:else}
							<code class="json-val json-before">{jsonValue(diff.before)}</code>
							<span class="json-arrow" aria-hidden="true">→</span>
							<code class="json-val json-after">{jsonValue(diff.after)}</code>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</div>
{/snippet}

<style>
	.diff-view {
		margin-top: 16px;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		overflow: hidden;
	}

	.state-banner {
		padding: 14px 16px;
		font-family: var(--mono);
		font-size: 13px;
	}
	.state-info {
		color: var(--muted);
	}
	.state-warn {
		color: #e9b4a8;
		background: rgba(224, 128, 112, 0.08);
		border-bottom: 1px solid rgba(224, 128, 112, 0.18);
	}

	.line-mode {
		display: flex;
		flex-direction: column;
		font-family: var(--mono);
		font-size: 12.5px;
		line-height: 1.55;
	}
	.line-mode .row {
		display: grid;
		grid-template-columns: 1fr 1fr;
	}
	.line-mode .col {
		padding: 2px 12px;
		white-space: pre-wrap;
		word-break: break-word;
		min-width: 0;
	}
	.line-mode .row-equal .col {
		color: var(--fg);
	}
	.line-mode .row-equal .col-left {
		border-right: 1px solid var(--border-soft);
	}
	.line-mode .row-removed-only .col-left {
		background: rgba(224, 128, 112, 0.10);
		border-right: 1px solid rgba(224, 128, 112, 0.20);
	}
	.line-mode .row-removed-only .col-right {
		background: rgba(60, 64, 76, 0.32);
		color: var(--text-faint);
	}
	.line-mode .row-added-only .col-right {
		background: rgba(198, 241, 53, 0.10);
	}
	.line-mode .row-added-only .col-left {
		background: rgba(60, 64, 76, 0.32);
		color: var(--text-faint);
		border-right: 1px solid var(--border-soft);
	}
	.line-mode .row-changed-pair .col-left {
		background: rgba(224, 128, 112, 0.10);
		border-right: 1px solid rgba(224, 128, 112, 0.20);
	}
	.line-mode .row-changed-pair .col-right {
		background: rgba(198, 241, 53, 0.10);
	}

	.line-mode .placeholder {
		color: var(--text-faint);
		font-style: italic;
	}

	.word-mode {
		display: grid;
		grid-template-columns: 1fr 1fr;
		font-family: var(--mono);
		font-size: 12.5px;
		line-height: 1.6;
	}
	.word-mode .col {
		padding: 12px 16px;
		white-space: pre-wrap;
		word-break: break-word;
		min-width: 0;
	}
	.word-mode .col-left {
		border-right: 1px solid var(--border-soft);
		background: rgba(224, 128, 112, 0.04);
	}
	.word-mode .col-right {
		background: rgba(198, 241, 53, 0.04);
	}

	.span-equal {
		color: var(--fg);
	}
	.span-remove {
		background: rgba(224, 128, 112, 0.28);
		color: #f0c2b7;
		border-radius: 2px;
		padding: 0 1px;
	}
	.span-add {
		background: rgba(198, 241, 53, 0.28);
		color: var(--fg);
		border-radius: 2px;
		padding: 0 1px;
	}

	/* ── JSON structural-diff mode ── */
	.json-mode {
		font-family: var(--mono);
		font-size: 12.5px;
		line-height: 1.55;
	}
	.json-verdict {
		font-weight: 600;
		letter-spacing: 0.01em;
	}
	.json-verdict-equal {
		color: var(--fg);
		background: rgba(198, 241, 53, 0.10);
		border-bottom: 1px solid rgba(198, 241, 53, 0.20);
	}
	.json-verdict-diff {
		color: #e9b4a8;
		background: rgba(224, 128, 112, 0.08);
		border-bottom: 1px solid rgba(224, 128, 112, 0.18);
		text-transform: uppercase;
	}
	.json-diff-list {
		list-style: none;
		margin: 0;
		padding: 6px 0;
	}
	.json-diff {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 8px;
		padding: 5px 16px;
		border-bottom: 1px solid var(--border-soft);
	}
	.json-diff:last-child {
		border-bottom: 0;
	}
	.json-kind {
		flex: 0 0 auto;
		font-size: 10px;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		padding: 1px 6px;
		border-radius: 999px;
	}
	.json-diff-added .json-kind {
		color: var(--bg);
		background: rgba(198, 241, 53, 0.85);
	}
	.json-diff-removed .json-kind {
		color: #f0c2b7;
		background: rgba(224, 128, 112, 0.30);
	}
	.json-diff-changed .json-kind,
	.json-diff-type-changed .json-kind {
		color: var(--fg);
		background: rgba(60, 64, 76, 0.55);
	}
	.json-path {
		color: var(--fg);
		font-weight: 600;
		word-break: break-all;
	}
	.json-val {
		word-break: break-all;
	}
	.json-before {
		color: #f0c2b7;
	}
	.json-after {
		color: var(--fg);
	}
	.json-arrow {
		color: var(--muted);
	}

	@media (max-width: 880px) {
		.line-mode .row,
		.word-mode {
			grid-template-columns: 1fr;
		}
		.line-mode .col-left,
		.word-mode .col-left {
			border-right: 0;
			border-bottom: 1px solid var(--border-soft);
		}
	}
</style>
