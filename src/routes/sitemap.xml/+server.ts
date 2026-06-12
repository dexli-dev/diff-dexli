// Sitemap for diff.dexli.dev — sibling-pattern from cron (v1 = homepage only).
// Origin hardcoded to match the SEO const convention used in +page.svelte.

const ORIGIN = 'https://diff.dexli.dev';
const homepageLastMod = '2026-06-09'; // JSON structural-diff mode landed

export const prerender = false;

export function GET(): Response {
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
	<url>
		<loc>${ORIGIN}/</loc>
		<lastmod>${homepageLastMod}</lastmod>
		<changefreq>monthly</changefreq>
		<priority>1.0</priority>
	</url>
</urlset>
`;
	return new Response(xml, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
}
