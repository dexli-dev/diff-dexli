<script lang="ts">
	// Parametric site wordmark — diff venture-4 variant. Inherits the
	// dexli.dev tiny-tools family Wordmark shape (per webhook / cron /
	// regex / apex hub Wordmarks); differs only in name/domain/glyph defaults.
	//
	// D4 BAR ITEM 10 — fifth-distinct-glyph constraint. The chosen glyph
	// for diff.dexli.dev MUST be distinct from every locked glyph in the
	// family graph at sealing time. As of 2026-05-29 these are:
	//
	//   webhook.dexli.dev → '⌁' (zigzag bolt — trigger/event)
	//   cron.dexli.dev    → '◷' (clock quadrant — schedule/time)
	//   regex.dexli.dev   → '∋' (contains-as-member — matches/membership)
	//   dexli.dev (apex)  → '❖' (diamond — multifaceted index)
	//
	// Eval will verify by walking the four live sibling/apex pages and
	// confirming the diff Wordmark renders a glyph not in {⌁, ◷, ∋, ❖}.
	//
	// Scaffold default below is a PLACEHOLDER ('Δ' — capital delta, the
	// universal change/diff symbol — semantically obvious for a diff tool,
	// and distinct from all four banned glyphs). Frontend is free to swap
	// to another distinct candidate (e.g. '⇄' bidirectional exchange,
	// '∆' increment-delta, '◫' partitioned-pane) by overriding the prop
	// on usage; engineer-domain call. If the swap happens, update this
	// comment block to reflect the final choice and re-assert distinctness.
	//
	// Do NOT edit the Wordmark BODY (the markup / CSS / Props shape) per
	// the family scaffold rule that locks the brand component's structural
	// surface. Only the glyph prop default is engineer-tunable.

	interface Props {
		name?: string;
		domain?: string;
		/** Fifth-distinct family-level glyph in the logo tile. */
		glyph?: string;
		/** Where the wordmark links to. Root of the site by default. */
		href?: string;
	}
	let { name = 'diff', domain = '.dexli.dev', glyph = 'Δ', href = '/' }: Props = $props();
</script>

<a class="brand" {href}>
	<span class="logo" aria-hidden="true">{glyph}</span>
	<span class="text">{name}<span class="tld">{domain}</span></span>
</a>

<style>
	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		color: var(--text);
		font-weight: 700;
		font-size: 15px;
		letter-spacing: -0.01em;
	}
	.brand:hover {
		text-decoration: none;
	}
	.logo {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 8px;
		background: var(--accent);
		color: #0a0b0d;
		font-size: 18px;
		box-shadow: 0 0 24px -6px var(--accent-glow);
	}
	.tld {
		color: var(--text-faint);
	}
</style>
