<script lang="ts">
	// Share-the-URL affordance for bar item 6. Three states:
	//   - ready:    URL fits within MAX_SHARE_URL_BYTES; one-click copies.
	//   - over-cap: URL would exceed cap; surface "diff too large to share
	//               via URL" message and provide copy-diff-result fallback.
	//   - copied:   ephemeral confirmation state (~1.6s) after a successful
	//               copy, returns to `ready` automatically.

	import { buildShareUrl, MAX_SHARE_URL_BYTES } from '$lib/share-url';
	import type { DiffState } from '$lib/url-state';

	interface Props {
		diffState: DiffState;
		/** Plaintext fallback used when URL exceeds the share cap. */
		fallbackText: string;
	}

	let { diffState, fallbackText }: Props = $props();

	const share = $derived(buildShareUrl(diffState));

	let copiedAt = $state(0);
	const isCopiedRecently = $derived(copiedAt > 0 && Date.now() - copiedAt < 1600);

	async function copy(text: string): Promise<void> {
		try {
			if (navigator?.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
				copiedAt = Date.now();
				setTimeout(() => {
					copiedAt = 0;
				}, 1700);
			}
		} catch {
			// Clipboard denied — leave the button state untouched. The visible
			// URL/fallback string still allows manual copy.
		}
	}
</script>

<div class="share">
	{#if share.ok}
		<button
			type="button"
			class="copy-btn"
			class:copied={isCopiedRecently}
			onclick={() => copy(share.url)}
		>
			{isCopiedRecently ? 'copied' : 'copy share URL'}
		</button>
		<span class="hint" aria-live="polite">
			{share.bytes.toLocaleString()}/{MAX_SHARE_URL_BYTES.toLocaleString()} bytes
		</span>
	{:else}
		<div class="over-cap" role="alert">
			<strong>diff too large to share via URL.</strong>
			Encoded link would be {share.bytes.toLocaleString()} bytes ({MAX_SHARE_URL_BYTES.toLocaleString()}-byte
			ceiling).
			<button
				type="button"
				class="copy-btn fallback"
				class:copied={isCopiedRecently}
				onclick={() => copy(fallbackText)}
			>
				{isCopiedRecently ? 'copied' : 'copy diff result instead'}
			</button>
		</div>
	{/if}
</div>

<style>
	.share {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		min-height: 44px;
	}
	.copy-btn {
		min-height: 36px;
		padding: 0 14px;
		font-family: var(--mono);
		font-size: 12px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--bg);
		background: var(--accent);
		border: 0;
		border-radius: var(--radius);
		cursor: pointer;
		transition:
			background 0.12s ease,
			color 0.12s ease,
			transform 0.06s ease;
	}
	.copy-btn:hover {
		background: var(--accent-dim);
	}
	.copy-btn:active {
		transform: translateY(1px);
	}
	.copy-btn:focus-visible {
		outline: 2px solid var(--fg);
		outline-offset: 2px;
	}
	.copy-btn.copied {
		background: var(--surface);
		color: var(--fg);
		border: 1px solid var(--accent);
	}
	.fallback {
		margin-top: 8px;
		background: var(--surface-2);
		color: var(--fg);
		border: 1px solid var(--border);
	}
	.fallback:hover {
		background: var(--surface);
	}
	.hint {
		font-family: var(--mono);
		font-size: 11px;
		color: var(--text-faint);
		font-variant-numeric: tabular-nums;
	}
	.over-cap {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 4px;
		padding: 10px 12px;
		background: rgba(224, 128, 112, 0.08);
		border: 1px solid rgba(224, 128, 112, 0.32);
		border-radius: var(--radius-sm);
		color: #e9b4a8;
		font-family: var(--mono);
		font-size: 12px;
		line-height: 1.45;
	}
	.over-cap strong {
		color: #f0c2b7;
	}
	@media (max-width: 640px) {
		.copy-btn {
			min-height: 44px;
			padding: 0 18px;
			font-size: 13px;
		}
	}
</style>
