<script lang="ts">
	// One input pane (textarea + size meter + cap-refusal banner).
	// Two-way bound to its `value` prop via Svelte 5's $bindable rune.
	// Cap enforcement (item 9) is handled here at the input boundary:
	// content exceeding PANE_BYTE_CAP is rejected with a clear inline
	// message; the textarea is NOT silently truncated.

	import { PANE_BYTE_CAP, utf8ByteLength } from '$lib/diff/cap';

	interface Props {
		label: string;
		labelText: string;
		value: string;
		placeholder?: string;
	}

	let {
		label,
		labelText,
		value = $bindable(''),
		placeholder = ''
	}: Props = $props();

	const byteCount = $derived(utf8ByteLength(value));
	const overCap = $derived(byteCount > PANE_BYTE_CAP);
	const fillPct = $derived(Math.min(100, Math.round((byteCount / PANE_BYTE_CAP) * 100)));
</script>

<div class="pane" class:over-cap={overCap}>
	<div class="pane-header">
		<label for={`pane-${label}`}>{labelText}</label>
		<span class="size-meter" aria-live="polite">
			{byteCount.toLocaleString()}/{PANE_BYTE_CAP.toLocaleString()} bytes
		</span>
	</div>
	<textarea
		id={`pane-${label}`}
		bind:value
		{placeholder}
		spellcheck="false"
		autocapitalize="off"
		aria-invalid={overCap}
	></textarea>
	<div class="meter" aria-hidden="true">
		<div class="bar" style="width: {fillPct}%"></div>
	</div>
	{#if overCap}
		<p class="cap-banner" role="alert">
			Input too large for v1 — content exceeds the {PANE_BYTE_CAP.toLocaleString()}-byte per-pane cap.
			Shorten the pane content to enable diff rendering.
		</p>
	{/if}
</div>

<style>
	.pane {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 0;
	}
	.pane-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
		font-family: var(--mono);
		font-size: 11px;
		color: var(--muted);
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}
	label {
		font-weight: 700;
		color: var(--fg);
	}
	.size-meter {
		font-variant-numeric: tabular-nums;
		color: var(--text-faint);
		text-transform: none;
		letter-spacing: 0;
	}
	textarea {
		width: 100%;
		min-height: 220px;
		max-height: 360px;
		resize: vertical;
		padding: 12px 14px;
		font-family: var(--mono);
		font-size: 13px;
		line-height: 1.55;
		color: var(--fg);
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		outline: none;
		tab-size: 4;
	}
	textarea:focus {
		border-color: var(--accent-dim);
		box-shadow: 0 0 0 3px var(--accent-glow);
	}
	.over-cap textarea {
		border-color: #e08070;
		box-shadow: 0 0 0 3px rgba(224, 128, 112, 0.18);
	}
	.meter {
		width: 100%;
		height: 3px;
		background: var(--surface-2);
		border-radius: 999px;
		overflow: hidden;
	}
	.meter .bar {
		height: 100%;
		background: var(--accent);
		transition: width 80ms linear;
	}
	.over-cap .meter .bar {
		background: #e08070;
	}
	.cap-banner {
		margin: 4px 0 0 0;
		padding: 10px 12px;
		background: rgba(224, 128, 112, 0.08);
		border: 1px solid rgba(224, 128, 112, 0.32);
		border-radius: var(--radius-sm);
		color: #e9b4a8;
		font-family: var(--mono);
		font-size: 12px;
		line-height: 1.45;
	}
</style>
