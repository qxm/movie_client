import { CreditRole } from '#lib/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMovie, deleteMovie, getMovie, getMovies } from './movies';
import type { CreateMovieInput, Movie } from '#lib/types';

const movie: Movie = {
	id: 'movie-1',
	title: 'Movie',
	releaseYear: 0,
	synopsis: '',
	artworkUrl: '',
	credits: [
		{
			personId: 'person-1',
			role: CreditRole.ACTOR,
			characterName: 'Hero',
			person: { id: 'person-1', name: 'Alice' }
		}
	]
};
let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
beforeEach(() => {
	fetchMock = vi.fn<typeof fetch>();
	vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());
function respond(data: unknown) {
	fetchMock.mockResolvedValue(
		new Response(JSON.stringify({ data }), { headers: { 'Content-Type': 'application/json' } })
	);
}
function request() {
	return JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
		query: string;
		variables: Record<string, unknown>;
	};
}

describe('movie GraphQL operations', () => {
	it('returns a movie list with resolved credits', async () => {
		respond({ movies: [movie] });
		await expect(getMovies()).resolves.toEqual([movie]);
		expect(request().query).toMatch(/movies\s*\{/);
		expect(request().query).toContain('credits');
	});
	it('returns an empty collection', async () => {
		respond({ movies: [] });
		await expect(getMovies()).resolves.toEqual([]);
	});
	it('sends the id as a variable when retrieving a movie', async () => {
		respond({ movie });
		await expect(getMovie('movie-1')).resolves.toEqual(movie);
		expect(request().variables).toEqual({ id: 'movie-1' });
		expect(request().query).toContain('query GetMovie');
	});
	it('returns null for a missing movie', async () => {
		respond({ movie: null });
		await expect(getMovie('missing')).resolves.toBeNull();
	});
	it('sends mutation input without response-only person fields', async () => {
		const input: CreateMovieInput = {
			title: 'Movie',
			releaseYear: 0,
			synopsis: '',
			artworkUrl: '',
			credits: [{ personId: 'person-1', role: CreditRole.ACTOR, characterName: 'Hero' }]
		};
		respond({ createMovie: movie });
		await expect(createMovie(input)).resolves.toEqual(movie);
		expect(request().variables).toEqual({ input });
		expect(request().query).toContain('mutation CreateMovie');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
	it('supports creating a movie without credits', async () => {
		const input: CreateMovieInput = {
			title: 'Movie',
			releaseYear: 0,
			synopsis: '',
			artworkUrl: '',
			credits: []
		};
		respond({ createMovie: { ...movie, credits: [] } });
		await expect(createMovie(input)).resolves.toMatchObject({ credits: [] });
		expect(request().variables).toEqual({ input });
	});
	it.each([true, false])('preserves deleteMovie result %s', async (deleted) => {
		respond({ deleteMovie: deleted });
		await expect(deleteMovie('movie-1')).resolves.toBe(deleted);
		expect(request().variables).toEqual({ id: 'movie-1' });
		expect(request().query).toContain('mutation DeleteMovie');
	});
	it('surfaces a create validation error', async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ errors: [{ message: 'Person not found' }] }))
		);
		await expect(
			createMovie({ title: 'Movie', releaseYear: 0, synopsis: '', artworkUrl: '', credits: [] })
		).rejects.toThrow('Person not found');
	});
});

describe('credit role serialization', () => {
	it.each(Object.values(CreditRole))('sends %s as a string to GraphQL', async (role) => {
		respond({ createMovie: movie });
		await createMovie({
			title: 'Movie',
			releaseYear: 0,
			synopsis: '',
			artworkUrl: '',
			credits: [{ personId: 'person-1', role, characterName: '' }]
		});
		expect(request().variables.input).toMatchObject({
			credits: [{ personId: 'person-1', role, characterName: '' }]
		});
		expect(typeof (request().variables.input as CreateMovieInput).credits[0].role).toBe('string');
	});
});
