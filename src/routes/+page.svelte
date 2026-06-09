<script lang="ts" module>
	// SEO surface for diff.dexli.dev — bar item 13. All 12 singletons declared
	// exactly-once below. JSON-LD WebApplication with applicationCategory =
	// DeveloperApplication (per D2 lineage where sibling tools are
	// WebApplications, hub is WebSite).
	const SEO = {
		title: 'diff · dexli.dev',
		description:
			'Two-pane diff for text and JSON. See line- or word-level changes, or a structural JSON compare that ignores key order. No account, no install — all state lives in the address bar.',
		url: 'https://diff.dexli.dev/',
		ogImage: 'https://diff.dexli.dev/og-card.png'
	};
	const JSON_LD = {
		'@context': 'https://schema.org',
		'@type': 'WebApplication',
		name: 'diff.dexli.dev',
		description: SEO.description,
		url: SEO.url,
		applicationCategory: 'DeveloperApplication',
		operatingSystem: 'Any',
		offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
	};
</script>

<script lang="ts">
	import Wordmark from '$lib/components/Wordmark.svelte';
	import SiteFooter from '$lib/components/SiteFooter.svelte';
	import DiffPane from '$lib/components/DiffPane.svelte';
	import DiffView from '$lib/components/DiffView.svelte';
	import ModeSelector from '$lib/components/ModeSelector.svelte';
	import ShareButton from '$lib/components/ShareButton.svelte';
	import { writeUrlState, type DiffMode } from '$lib/url-state';
	import { diffAsText } from '$lib/diff/serialize';
	import { untrack } from 'svelte';

	let { data } = $props();

	// `data.initial` is the +page.ts load() result — captured once at mount
	// as the seed for in-memory state. `untrack` makes the intent explicit
	// (initial-value-only; not reactive to data prop changes) and silences
	// Svelte's `state_referenced_locally` lint at the cost of one extra line.
	let a = $state(untrack(() => data.initial.a));
	let b = $state(untrack(() => data.initial.b));
	let mode = $state<DiffMode>(untrack(() => data.initial.mode));

	// Debounced URL sync. URL stays the share-target source of truth via
	// the in-memory state below; this $effect keeps the address bar in
	// step (~400ms after last keystroke) so address-bar copy works too.
	$effect(() => {
		const params = writeUrlState({ a, b, mode });
		const query = params.toString();
		const next = query ? `?${query}` : '/';
		if (typeof window !== 'undefined') {
			const handle = setTimeout(() => {
				try {
					history.replaceState(history.state, '', next);
				} catch {
					// e.g. cross-origin iframe — ignore; in-memory state remains source of truth
				}
			}, 400);
			return () => clearTimeout(handle);
		}
	});

	const fallbackText = $derived(diffAsText(a, b, mode));
</script>

<svelte:head>
	<title>{SEO.title}</title>
	<meta name="description" content={SEO.description} />
	<link rel="canonical" href={SEO.url} />
	<meta name="robots" content="index,follow" />

	<meta property="og:type" content="website" />
	<meta property="og:url" content={SEO.url} />
	<meta property="og:title" content={SEO.title} />
	<meta property="og:description" content={SEO.description} />
	<meta property="og:image" content={SEO.ogImage} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={SEO.title} />
	<meta name="twitter:description" content={SEO.description} />

	{@html `<script type="application/ld+json">${JSON.stringify(JSON_LD)}</script>`}
</svelte:head>

<div class="page">
	<header class="topbar wrap">
		<Wordmark />
	</header>

	<main class="wrap" data-engineer-slot="diff">
		<section class="hero" aria-label="introduction">
			<h1>diff</h1>
			<p class="lede">
				Paste two pieces of text, or two JSON values. See what changed — line, word, or a
				structural JSON compare that ignores key order. Share the URL — state lives in the address
				bar.
			</p>
		</section>

		<section class="controls" aria-label="diff controls">
			<ModeSelector bind:value={mode} />
			<ShareButton diffState={{ a, b, mode }} {fallbackText} />
		</section>

		<section class="panes" aria-label="diff input panes">
			<DiffPane label="left" labelText="left" bind:value={a} placeholder="paste the original text here" />
			<DiffPane label="right" labelText="right" bind:value={b} placeholder="paste the changed text here" />
		</section>

		<DiffView {a} {b} {mode} />
	</main>

	<SiteFooter />
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

	.hero {
		padding-top: 36px;
		padding-bottom: 24px;
		max-width: 720px;
	}
	.hero h1 {
		font-family: var(--display);
		font-size: clamp(40px, 6vw, 56px);
		font-weight: 800;
		letter-spacing: -0.03em;
		line-height: 1.05;
		margin: 0 0 14px 0;
	}
	.lede {
		font-family: var(--display);
		font-size: clamp(15px, 2vw, 17px);
		font-weight: 500;
		line-height: 1.5;
		color: var(--muted);
		margin: 0;
	}

	.controls {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 14px;
		padding: 12px 0;
	}

	.panes {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
		margin-top: 6px;
	}

	@media (max-width: 880px) {
		.panes {
			grid-template-columns: 1fr;
		}
	}
	@media (max-width: 640px) {
		.wrap {
			padding: 0 14px;
		}
		.hero {
			padding-top: 24px;
		}
	}
</style>
