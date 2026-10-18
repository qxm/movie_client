import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const settings = vi.hoisted(() => ({}) as Record<string, string | undefined>);
vi.mock('#lib/server/env', () => ({ env: settings }));
import { POST } from '../../routes/api/graphql/+server';

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
beforeEach(() => {
	settings.GRAPHQL_GATEWAY_URL = 'http://gateway.test:8080';
	fetchMock = vi.fn<typeof fetch>();
	vi.stubGlobal('fetch', fetchMock);
	vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});
function post(body = JSON.stringify({ query: '{ __typename }', variables: {} })) {
	const request = new Request('http://localhost:5173/api/graphql', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Origin: 'http://localhost:5173',
			Cookie: 'session=test-only'
		},
		body
	});
	return POST({ request } as Parameters<typeof POST>[0]);
}

describe('server-side GraphQL proxy', () => {
	it('forwards the body without leaking browser Origin or Cookie headers', async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ data: { __typename: 'Query' } }), {
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const body = JSON.stringify({
			query: 'query Movie($id:ID!){ movie(id:$id){id} }',
			variables: { id: 'movie-1' }
		});
		const response = await post(body);
		expect(await response.json()).toEqual({ data: { __typename: 'Query' } });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe('http://gateway.test:8080/graphql');
		expect(options?.body).toBe(body);
		expect(options?.method).toBe('POST');
		const headers = new Headers(options?.headers);
		expect(headers.get('Content-Type')).toBe('application/json');
		expect(headers.has('Origin')).toBe(false);
		expect(headers.has('Cookie')).toBe(false);
		expect(options?.signal).toBeInstanceOf(AbortSignal);
	});

	it('normalizes a trailing slash in the configured gateway URL', async () => {
		settings.GRAPHQL_GATEWAY_URL = 'http://gateway.test:8080/';
		fetchMock.mockResolvedValue(new Response('{}'));
		await post();
		expect(fetchMock.mock.calls[0][0]).toBe('http://gateway.test:8080/graphql');
	});

	it('uses the Windows loopback default when no gateway setting is present', async () => {
		settings.GRAPHQL_GATEWAY_URL = undefined;
		fetchMock.mockResolvedValue(new Response('{}'));
		await post();
		expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:8080/graphql');
	});

	it('preserves upstream HTTP status, content type and diagnostic body', async () => {
		fetchMock.mockResolvedValue(
			new Response('Upstream failed', { status: 503, headers: { 'Content-Type': 'text/plain' } })
		);
		const response = await post();
		expect(response.status).toBe(503);
		expect(response.headers.get('Content-Type')).toBe('text/plain');
		expect(await response.text()).toBe('Upstream failed');
	});

	it('passes through HTTP-200 GraphQL errors rather than reporting transport failure', async () => {
		const body = { errors: [{ message: 'Person name cannot be empty' }] };
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
		);
		const response = await post();
		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(body);
	});

	it('maps connection refusal to 502 and includes the actionable cause', async () => {
		fetchMock.mockRejectedValue(new TypeError('fetch failed', { cause: { code: 'ECONNREFUSED' } }));
		await expect(post()).rejects.toMatchObject({
			status: 502,
			body: { message: expect.stringContaining('ECONNREFUSED') }
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it('maps timeouts to 502 without automatically repeating the operation', async () => {
		fetchMock.mockRejectedValue(new DOMException('Request timed out', 'TimeoutError'));
		await expect(post()).rejects.toMatchObject({
			status: 502,
			body: { message: expect.stringContaining('TimeoutError') }
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
