import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { graphql } from './graphql';

const query = 'query Movie($id: ID!) { movie(id: $id) { id title } }';
const jsonResponse = (body: unknown) =>
	new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
beforeEach(() => {
	fetchMock = vi.fn<typeof fetch>();
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('GraphQL request and response contract', () => {
	it('posts query and variables as JSON to the same-origin proxy', async () => {
		const variables = { id: 'movie-1', input: { title: '电影 "A"', credits: [], biography: null } };
		fetchMock.mockResolvedValue(
			jsonResponse({ data: { movie: { id: 'movie-1', title: 'Movie' } } })
		);
		await expect(graphql(query, variables)).resolves.toEqual({
			movie: { id: 'movie-1', title: 'Movie' }
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe('/api/graphql');
		expect(options?.method).toBe('POST');
		expect(new Headers(options?.headers).get('Content-Type')).toBe('application/json');
		expect(JSON.parse(String(options?.body))).toEqual({ query, variables });
	});

	it('defaults omitted variables to an empty object', async () => {
		fetchMock.mockResolvedValue(jsonResponse({ data: { movies: [] } }));
		await expect(graphql('{ movies { id } }')).resolves.toEqual({ movies: [] });
		expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).variables).toEqual({});
	});

	it('accepts nullable fields and false mutation results inside data', async () => {
		fetchMock.mockResolvedValue(jsonResponse({ data: { movie: null, deleteMovie: false } }));
		await expect(graphql(query)).resolves.toEqual({ movie: null, deleteMovie: false });
	});

	it('accepts an empty errors array with successful data', async () => {
		fetchMock.mockResolvedValue(jsonResponse({ errors: [], data: { movies: [] } }));
		await expect(graphql(query)).resolves.toEqual({ movies: [] });
	});

	it.each([400, 401, 403, 500, 502])(
		'rejects HTTP %s and includes diagnostic response details',
		async (status) => {
			const response = new Response('Gateway diagnostic', { status, statusText: 'Request failed' });
			Object.defineProperty(response, 'url', { value: 'http://localhost:5173/api/graphql' });
			fetchMock.mockResolvedValue(response);
			await expect(graphql(query)).rejects.toThrow(
				`GraphQL HTTP ${status} Request failed\nURL: http://localhost:5173/api/graphql\nResponse: Gateway diagnostic`
			);
		}
	);

	it('surfaces GraphQL errors even when HTTP status is 200', async () => {
		fetchMock.mockResolvedValue(jsonResponse({ errors: [{ message: 'Person not found' }] }));
		await expect(graphql(query)).rejects.toThrow('Person not found');
	});

	it('combines multiple GraphQL error messages', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ errors: [{ message: 'Invalid title' }, { message: 'Invalid year' }] })
		);
		await expect(graphql(query)).rejects.toThrow('Invalid title; Invalid year');
	});

	it('rejects partial data accompanied by GraphQL errors', async () => {
		fetchMock.mockResolvedValue(
			jsonResponse({ data: { movie: null }, errors: [{ message: 'Service unavailable' }] })
		);
		await expect(graphql(query)).rejects.toThrow('Service unavailable');
	});

	it.each([{}, { data: null }, { errors: [] }, null])(
		'rejects a successful response without data: %j',
		async (body) => {
			fetchMock.mockResolvedValue(jsonResponse(body));
			await expect(graphql(query)).rejects.toThrow('GraphQL returned no data.');
		}
	);

	it('rejects malformed JSON instead of returning fake success', async () => {
		fetchMock.mockResolvedValue(new Response('<html>Unexpected upstream response</html>'));
		await expect(graphql(query)).rejects.toBeInstanceOf(SyntaxError);
	});

	it('rejects an empty HTTP 204 response', async () => {
		fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
		await expect(graphql(query)).rejects.toBeInstanceOf(SyntaxError);
	});

	it('propagates a network failure without automatically retrying a mutation', async () => {
		const failure = new TypeError('Failed to fetch');
		fetchMock.mockRejectedValue(failure);
		await expect(graphql('mutation { deleteMovie(id: "movie-1") }')).rejects.toBe(failure);
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
