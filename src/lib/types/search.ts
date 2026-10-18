import type { Movie } from './movie';
import type { Person } from './person';

export type MovieSearchResult = Pick<
	Movie,
	'id' | 'title' | 'releaseYear' | 'synopsis' | 'artworkUrl'
>;
export type PersonSearchResult = Person;

export interface SearchResult {
	movies: MovieSearchResult[];
	people: PersonSearchResult[];
}
