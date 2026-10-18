/** Keep return navigation inside known collection pages, including after refresh. */
export function personReturnTarget(raw: string | null): { href: string; label: string } {
	const fallback = { href: '/search', label: 'Back to search' };
	if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return fallback;
	try {
		const base = 'https://movie-manager.invalid';
		const url = new URL(raw, base);
		if (url.origin !== base) return fallback;
		const href = url.pathname + url.search;
		if (url.pathname === '/') return { href, label: 'Back to movies' };
		if (url.pathname === '/search')
			return {
				href,
				label: url.searchParams.get('q') ? 'Back to search results' : 'Back to search'
			};
		if (/^\/movies\/[a-zA-Z0-9-]+$/.test(url.pathname)) return { href, label: 'Back to movie' };
	} catch {
		/* Invalid or unsupported targets use the search page. */
	}
	return fallback;
}

export function personHref(id: string, returnTo: string): string {
	return `/people/${encodeURIComponent(id)}?returnTo=${encodeURIComponent(personReturnTarget(returnTo).href)}`;
}
