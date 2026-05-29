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
	import type { LineDiffRow, SpanRun, WordDiff } from '$lib/diff/types';
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
	const identical = $derived(a === b && a !== '');

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
		return wordResult === null;
	});
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
