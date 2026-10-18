import { describe, it, expect } from 'vitest';
import { personReturnTarget, personHref } from './person';

describe('person return navigation', () => {
	it('returns to the source movie', () => {
		expect(personReturnTarget('/movies/movie-1')).toEqual({
			href: '/movies/movie-1',
			label: 'Back to movie'
		});
	});
	it('returns to the collection', () => {
		expect(personReturnTarget('/')).toEqual({ href: '/', label: 'Back to movies' });
	});
	it('preserves search keyword and filter', () => {
		const href = '/search?q=Alice+Actor&filter=people';
		expect(personReturnTarget(href)).toEqual({ href, label: 'Back to search results' });
	});
	it.each([
		null,
		'',
		'https://example.com',
		'//example.com',
		'javascript:alert(1)',
		'/people/person-2',
		'/add',
		'/\\example.com',
		'/%2f%2fexample.com'
	])('uses a safe fallback for %s', (target) => {
		expect(personReturnTarget(target)).toEqual({ href: '/search', label: 'Back to search' });
	});
	it('encodes the person id and nested return URL', () => {
		const href = personHref('person-1', '/search?q=Alice+Actor&filter=people');
		const url = new URL(href, 'https://movie-manager.invalid');
		expect(url.pathname).toBe('/people/person-1');
		expect(url.searchParams.get('returnTo')).toBe('/search?q=Alice+Actor&filter=people');
	});
});
