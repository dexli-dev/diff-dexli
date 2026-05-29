// Live-HTML walk for diff.dexli.dev — bar item 10:
//   * Route 200 (item 1 first-load)
//   * Sample content pre-populated on first-load (item 1)
//   * URL hydration: `?a=&b=&mode=` propagates into SSR state (item 4)
//   * Brand inheritance — Wordmark Δ + footer DOM (item 10)
//   * SEO singleton cardinality on / (item 13: all 12 must be exactly-1)
//   * JSON-LD WebApplication shape (item 13)
//   * Mode selector + share button visible (items 4, 6)
//   * Two input panes present (item 3c)
//
// Approach mirrors the D3 pattern: globalSetup spawns production
// adapter-node server on 127.0.0.1; tests fetch live HTML; assertions use
// regex/string matchers on the SSR response.

import { describe, expect, it, beforeAll } from 'vitest';

let baseUrl: string;

beforeAll(() => {
	baseUrl = process.env.TEST_SERVER_URL || 'http://127.0.0.1:3400';
});

async function fetchHtml(path: string): Promise<{ status: number; html: string }> {
	const resp = await fetch(`${baseUrl}${path}`);
	return { status: resp.status, html: await resp.text() };
}

function countOccurrences(haystack: string, needleRegex: RegExp): number {
	return (haystack.match(needleRegex) || []).length;
}

describe('first-load + sample content — bar item 1', () => {
	it('GET / returns 200', async () => {
		const r = await fetchHtml('/');
		expect(r.status).toBe(200);
	});

	it('first-load pre-populates both panes with sample content (no URL params)', async () => {
		const r = await fetchHtml('/');
		// The textareas SSR-render the sample content as their initial value.
		// SvelteKit serialises bound textareas as <textarea>content</textarea>.
		expect(r.html).toContain('function parseQuery(input)');
		expect(r.html).toContain('Object.fromEntries(params)');
		expect(r.html).toContain('Object.fromEntries(params.entries())');
	});

	it('first-load does not surface a tutorial overlay / modal / signup', async () => {
		const r = await fetchHtml('/');
		expect(r.html).not.toMatch(/class="[^"]*modal\b/i);
		expect(r.html).not.toMatch(/class="[^"]*tutorial\b/i);
		expect(r.html).not.toMatch(/class="[^"]*signup\b/i);
		expect(r.html).not.toMatch(/<form\b[^>]*action=/);
	});

	it('h1 + lede visible (5-second comprehensibility)', async () => {
		const r = await fetchHtml('/');
		expect(r.html).toMatch(/<h1[^>]*>diff<\/h1>/);
		expect(r.html).toContain('state lives in the address bar');
	});
});

describe('URL hydration — bar item 4', () => {
	it('reads a + b + mode from URL into SSR state', async () => {
		const url = '/?a=hello%20world&b=hello%20universe&mode=word';
		const r = await fetchHtml(url);
		expect(r.status).toBe(200);
		// Both panes should reflect the URL-hydrated content
		expect(r.html).toContain('hello world');
		expect(r.html).toContain('hello universe');
		// Mode 'word' button should be marked as the active radio
		expect(r.html).toMatch(/<button[^>]*aria-checked="true"[^>]*>\s*word\s*<\/button>/);
	});

	it('default mode is "line" when ?mode is absent', async () => {
		const r = await fetchHtml('/?a=A&b=B');
		expect(r.html).toMatch(/<button[^>]*aria-checked="true"[^>]*>\s*line\s*<\/button>/);
	});

	it('falls back to defaults for invalid mode value', async () => {
		const r = await fetchHtml('/?mode=char');
		// Invalid mode → DEFAULT_MODE = 'line'
		expect(r.html).toMatch(/<button[^>]*aria-checked="true"[^>]*>\s*line\s*<\/button>/);
	});
});

describe('brand inheritance — bar item 10', () => {
	it('Wordmark renders with family-level glyph Δ (distinct from ⌁/◷/∋/❖)', async () => {
		const r = await fetchHtml('/');
		expect(r.html).toMatch(/<span class="logo[^"]*"[^>]*>Δ<\/span>/);
		const wordmarkBlock = r.html.match(/<a class="brand[^"]*"[\s\S]*?<\/a>/)?.[0] || '';
		expect(wordmarkBlock).not.toMatch(/[⌁◷∋❖]/);
	});

	it('footer surfaces dexli.dev tiny-tools family identity + sibling links', async () => {
		const r = await fetchHtml('/');
		expect(r.html).toMatch(/<footer class="foot wrap[^"]*">/);
		expect(r.html).toContain('Part of the');
		expect(r.html).toMatch(/<a href="https:\/\/dexli\.dev"[^>]*><span class="self[^"]*">dexli\.dev<\/span><\/a>/);
		// Three sibling links to webhook/cron/regex (NOT self-link to diff)
		for (const sibling of ['webhook', 'cron', 'regex']) {
			expect(r.html).toMatch(
				new RegExp(
					`<a\\s+href="https://${sibling}\\.dexli\\.dev"\\s+rel="external"[^>]*>${sibling}\\.dexli\\.dev</a>`
				)
			);
		}
		// No self-link to diff in family-link inventory
		const familyBlock = r.html.match(/<span class="family[^"]*">[\s\S]*?<\/span>/)?.[0] || '';
		expect(familyBlock).not.toMatch(/<a href="https:\/\/diff\.dexli\.dev"/);
		// Locked literal "2026 · dexli.dev"
		expect(r.html).toMatch(/<span class="dim[^"]*">2026 · dexli\.dev<\/span>/);
	});
});

describe('SEO singleton cardinality — bar item 13', () => {
	const SINGLETONS = [
		{ name: 'title', regex: /<title[^>]*>[\s\S]*?<\/title>/g },
		{ name: 'meta description', regex: /<meta\s+name="description"[^>]*>/g },
		{ name: 'canonical', regex: /<link\s+rel="canonical"[^>]*>/g },
		{ name: 'meta robots', regex: /<meta\s+name="robots"[^>]*>/g },
		{ name: 'og:title', regex: /<meta\s+property="og:title"[^>]*>/g },
		{ name: 'og:description', regex: /<meta\s+property="og:description"[^>]*>/g },
		{ name: 'og:url', regex: /<meta\s+property="og:url"[^>]*>/g },
		{ name: 'og:type', regex: /<meta\s+property="og:type"[^>]*>/g },
		{ name: 'og:image', regex: /<meta\s+property="og:image"[^>]*>/g },
		{ name: 'twitter:card', regex: /<meta\s+name="twitter:card"[^>]*>/g },
		{ name: 'twitter:title', regex: /<meta\s+name="twitter:title"[^>]*>/g },
		{ name: 'twitter:description', regex: /<meta\s+name="twitter:description"[^>]*>/g }
	];

	it.each(SINGLETONS)('has exactly one $name on /', async ({ name, regex }) => {
		const r = await fetchHtml('/');
		const count = countOccurrences(r.html, regex);
		expect(count, `${name} count`).toBe(1);
	});

	it('canonical href matches the route', async () => {
		const r = await fetchHtml('/');
		const canonical = r.html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)?.[1];
		expect(canonical).toBe('https://diff.dexli.dev/');
	});

	it('og:type is "website"', async () => {
		const r = await fetchHtml('/');
		expect(r.html).toMatch(/<meta\s+property="og:type"\s+content="website"/);
	});

	it('twitter:card is summary_large_image', async () => {
		const r = await fetchHtml('/');
		expect(r.html).toMatch(/<meta\s+name="twitter:card"\s+content="summary_large_image"/);
	});

	it('meta robots is index,follow', async () => {
		const r = await fetchHtml('/');
		expect(r.html).toMatch(/<meta\s+name="robots"\s+content="index,follow"/);
	});

	it('JSON-LD WebApplication present, valid, with required fields', async () => {
		const r = await fetchHtml('/');
		const ld = r.html.match(/<script\s+type="application\/ld\+json">([\s\S]+?)<\/script>/)?.[1];
		expect(ld).toBeTruthy();
		const parsed = JSON.parse(ld!);
		expect(parsed['@type']).toBe('WebApplication');
		expect(parsed.name).toBe('diff.dexli.dev');
		expect(parsed.description).toBeTruthy();
		expect(parsed.url).toBe('https://diff.dexli.dev/');
		expect(parsed.applicationCategory).toBe('DeveloperApplication');
	});

	it('exactly one JSON-LD block', async () => {
		const r = await fetchHtml('/');
		const count = countOccurrences(r.html, /<script\s+type="application\/ld\+json">/g);
		expect(count).toBe(1);
	});
});

describe('substrate refinement parity', () => {
	it('analytics snippet present exactly once in served HTML', async () => {
		// Original D4 oracle was "ANALYTICS_SLOT marker grep-findable" (the
		// empty-marker stage). M wired Umami 2026-05-29 with a shared
		// `aca6a030-...` id; then later that day switched to per-tool sites
		// for clean per-tool dashboards. This repo's per-tool id is
		// `8e344abf-d097-43f4-8cac-a0fec37515d0`. Same cardinality
		// discipline — exactly-one in served HTML, pointed at THIS repo's
		// id. The data-website-id literal is specific enough to avoid
		// false-positives, and matching the per-tool id (rather than the
		// shared one or the snippet URL alone) catches cross-tool
		// misconfiguration too — if someone accidentally copies a sibling's
		// snippet into this app.html, this test fails.
		const r = await fetchHtml('/');
		const matches =
			r.html.match(/data-website-id="8e344abf-d097-43f4-8cac-a0fec37515d0"/g) || [];
		expect(matches.length).toBe(1);
	});
});

describe('app surface presence — bar items 3, 4, 6', () => {
	it('two input panes (item 3c) — left + right textareas', async () => {
		const r = await fetchHtml('/');
		const textareas = countOccurrences(r.html, /<textarea\b/g);
		expect(textareas).toBe(2);
		expect(r.html).toContain('id="pane-left"');
		expect(r.html).toContain('id="pane-right"');
	});

	it('mode selector renders both line + word buttons (item 4)', async () => {
		const r = await fetchHtml('/');
		expect(r.html).toMatch(/<button[^>]*role="radio"[^>]*>\s*line\s*<\/button>/);
		expect(r.html).toMatch(/<button[^>]*role="radio"[^>]*>\s*word\s*<\/button>/);
	});

	it('share affordance visible in primary chrome (not buried) — item 6', async () => {
		const r = await fetchHtml('/');
		// "copy share URL" CTA in the controls section
		expect(r.html).toMatch(/copy share URL/);
	});

	it('diff output region present (item 3)', async () => {
		const r = await fetchHtml('/');
		expect(r.html).toMatch(/aria-label="Diff output"/);
	});
});
