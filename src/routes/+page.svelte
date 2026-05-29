<script lang="ts">
	// diff.dexli.dev — D4 venture-4 cycle 1 scope.
	//
	// CTO SCAFFOLD: engineer onboarding surface. Two slots below — Wordmark
	// brand-shell (CTO-owned, do not edit) and the diff app body
	// (FRONTEND slice). Bar item 10's brand-inheritance oracle is satisfied
	// by the Wordmark render regardless of what frontend builds in the body.
	// Footer placement is FRONTEND slice (per D2/D3 family-footer-inheritance
	// pattern — sibling-link inventory + locked literals identical to
	// dexli-hub's SiteFooter).
	//
	// Engineer fills bar items inside <main>:
	//   1 frictionless first-load (pre-populated panes, no overlay/modal)
	//   2 live diff <200ms after last keystroke
	//   3 three coordinated diff affordances (line marker + word-level + dual-pane visibility)
	//   4 two diff modes (line default + word) with URL state
	//   5 edge-content states clean
	//   6 URL-shareable + 4096-byte ceiling with explicit refusal
	//   7 family-handoff inbound recipient via vendored/dexli-family parser
	//   8 mobile 375px reachable
	//   9 100KB per-pane cap with explicit refusal
	//   13 SEO surface via <svelte:head>
	//
	// Item 10 (Wordmark + family 5th-distinct glyph) — CTO scaffold's
	// Wordmark default is 'Δ' (capital delta — universal change/diff
	// symbol, semantically obvious, distinct from {⌁,◷,∋,❖}). Frontend may
	// override the glyph prop on usage if a better fifth-distinct choice
	// surfaces; update Wordmark.svelte's comment block to reflect the
	// final choice and re-assert distinctness if you swap.
	//
	// Item 7 — family-handoff. The @dexli/family library lives at
	// vendored/dexli-family (git submodule pinned to dexli-family master).
	// Import via the submodule path; do NOT vendor a behavioral clone.
	// The shared parser/composer is the contract — code-path audit per
	// CEO Q1.
	import Wordmark from '$lib/components/Wordmark.svelte';
</script>

<svelte:head>
	<title>diff · dexli.dev</title>
</svelte:head>

<div class="page">
	<!-- BRAND-SHELL :: CTO-owned. Frontend may add chrome controls AROUND
	     the Wordmark in the header (share-the-URL affordance per item 6
	     can live here or in a primary chrome bar adjacent to it); do not
	     remove or replace the Wordmark itself. -->
	<header class="topbar wrap">
		<Wordmark />
		<!-- FRONTEND: chrome controls (share affordance, mode selector,
		     etc.) belong here or in a primary bar inside <main>. -->
	</header>

	<!-- DIFF APP BODY :: FRONTEND slice. Build bar items 1–9 inside <main>
	     plus item 13 SEO meta in <svelte:head> above. -->
	<main class="wrap" data-engineer-slot="diff">
		<!-- TODO(frontend): two diff panes (a, b), live-diff rendering,
		     mode selector (line | word), share affordance, edge-state
		     handling, mobile 375px reflow. -->
	</main>

	<!-- FAMILY-FOOTER :: FRONTEND slice per D2/D3 inheritance pattern.
	     Surface "dexli.dev family" identity + links to webhook.dexli.dev
	     + cron.dexli.dev + regex.dexli.dev + the apex hub dexli.dev.
	     DOM should match dexli-hub's SiteFooter verbatim (link inventory
	     + locked literals identical per family-footer-inheritance rule). -->
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background:
			radial-gradient(800px 420px at 78% -10%, var(--accent-glow), transparent 60%),
			radial-gradient(900px 500px at 8% 110%, rgba(198, 241, 53, 0.05), transparent 60%);
	}
	.wrap {
		width: 100%;
		max-width: var(--maxw);
		margin: 0 auto;
		padding: 0 24px;
	}
	.topbar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 22px;
		padding-bottom: 22px;
	}
	main {
		flex: 1;
		padding-top: 8px;
		padding-bottom: 56px;
	}
</style>
