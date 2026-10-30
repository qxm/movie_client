import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPerson, getPeople } from './people';
import type { Person } from '#lib/types';

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
beforeEach(() => {
	fetchMock = vi.fn<typeof fetch>();
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
function respond(data: unknown) {
	fetchMock.mockResolvedValue(new Response(JSON.stringify({ data })));
}

describe('people GraphQL operations', () => {
	it('returns people with nullable biographies', async () => {
		const people: Person[] = [{ id: 'person-1', name: 'Alice', biography: null, photoUrl: null }];
		respond({ people });
		await expect(getPeople()).resolves.toEqual(people);
	});
	it('returns an empty people list', async () => {
		respond({ people: [] });
		await expect(getPeople()).resolves.toEqual([]);
	});
	it('creates a person using variables, including unicode and quotes', async () => {
		const input = { name: '王 "Alice"', biography: 'First line\nSecond line' };
		respond({ createPerson: { id: 'person-1', ...input } });
		await expect(createPerson(input)).resolves.toEqual({ id: 'person-1', ...input });
		const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
		expect(body.variables).toEqual({ input });
		expect(body.query).toContain('mutation CreatePerson');
		expect(body.query).not.toContain(input.name);
	});
	it('allows an empty biography in mutation input', async () => {
		const input = { name: 'Alice', biography: '' };
		respond({ createPerson: { id: 'person-1', name: 'Alice', biography: null, photoUrl: null } });
		await expect(createPerson(input)).resolves.toMatchObject({ biography: null });
		expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).variables).toEqual({ input });
	});
	it('propagates GraphQL validation failures', async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ errors: [{ message: 'Person name cannot be empty' }] }))
		);
		await expect(createPerson({ name: '', biography: '' })).rejects.toThrow(
			'Person name cannot be empty'
		);
	});
});

describe('person photos', () => {
	it('includes photo URL in create input and response selection', async () => {
		const input = { name: 'Alice', biography: '', photoUrl: '/api/artworks/alice.webp' };
		respond({ createPerson: { id: 'p1', ...input } });
		await expect(createPerson(input)).resolves.toMatchObject({ photoUrl: input.photoUrl });
		const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
		expect(request.variables.input.photoUrl).toBe(input.photoUrl);
		expect(request.query).toContain('photoUrl');
	});
});
