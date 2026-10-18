import { graphql } from './graphql';
import type { Movie, CreateMovieInput } from '#lib/types';

// Preserve existing API-module type imports for callers.
export type { Movie, MovieCredit, MovieCreditInput, CreateMovieInput } from '#lib/types';

export async function getMovies(): Promise<Movie[]> {
	const query = `
        query {
            movies {
                id
                title
                releaseYear
                synopsis
                artworkUrl
		credits {
			personId
			role
			characterName
			person {
                            id
                            name
                            biography
                        } 
		}
            }
        }
    `;

	const data = await graphql<{ movies: Movie[] }>(query);

	return data.movies;
}

export async function createMovie(input: CreateMovieInput): Promise<Movie> {
	const mutation = `
        mutation CreateMovie($input: CreateMovieInput!) {
            createMovie(input: $input) {
                id
                title
                releaseYear
                synopsis
                artworkUrl
                credits {
                    personId
                    role
                    characterName
                    person { id name biography }
                }
            }
        }
    `;

	const data = await graphql<{ createMovie: Movie }>(mutation, { input });

	return data.createMovie;
}

export async function getMovie(id: string): Promise<Movie | null> {
	const query = `
        query GetMovie($id: ID!) {
            movie(id: $id) {
                id
                title
                releaseYear
                synopsis
                artworkUrl
                credits {
                    personId
                    role
                    characterName
		    person {
                        id
                        name
                        biography
                    }
                }
            }
        }
    `;

	const data = await graphql<{ movie: Movie | null }>(query, { id });

	return data.movie;
}

export async function deleteMovie(id: string): Promise<boolean> {
	const mutation = `
        mutation DeleteMovie($id: ID!) {
            deleteMovie(id: $id)
        }
    `;

	const data = await graphql<{ deleteMovie: boolean }>(mutation, { id });

	return data.deleteMovie;
}
