<script lang="ts">
	// line / word mode toggle — bar item 4. Two named, individually-selectable
	// controls in a single row group. Changes propagate via the bound `value`
	// prop. Tap targets ≥44px tall.

	import { DIFF_MODES, type DiffMode } from '$lib/url-state';

	interface Props {
		value: DiffMode;
	}

	let { value = $bindable('line') }: Props = $props();

	// Button labels are derived from the raw mode string. The CSS uppercases
	// them, so 'line'/'word' already read cleanly; this map exists so 'json'
	// shows as the proper acronym and any future mode can override its label.
	const MODE_LABELS: Record<DiffMode, string> = {
		line: 'line',
		word: 'word',
		json: 'JSON'
	};
</script>

<div class="mode-group" role="radiogroup" aria-label="Diff granularity">
	{#each DIFF_MODES as mode (mode)}
		<button
			type="button"
			class="mode-btn"
			class:active={value === mode}
			role="radio"
			aria-checked={value === mode}
			onclick={() => (value = mode)}
		>
			{MODE_LABELS[mode]}
		</button>
	{/each}
</div>

<style>
	.mode-group {
		display: inline-flex;
		gap: 0;
		padding: 4px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}
	.mode-btn {
		min-height: 36px;
		padding: 0 14px;
		font-family: var(--mono);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted);
		background: transparent;
		border: 0;
		border-radius: var(--radius-sm);
		cursor: pointer;
		transition:
			background 0.12s ease,
			color 0.12s ease;
	}
	.mode-btn:hover {
		color: var(--fg);
	}
	.mode-btn.active {
		background: var(--accent);
		color: var(--bg);
	}
	.mode-btn:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}
	@media (max-width: 640px) {
		.mode-btn {
			min-height: 44px;
			padding: 0 18px;
			font-size: 13px;
		}
	}
</style>
