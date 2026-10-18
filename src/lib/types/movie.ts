import type { PersonSummary } from './person';

export type CreditRole = 'ACTOR' | 'DIRECTOR' | 'WRITER' | 'PRODUCER';

export interface MovieCredit {
	personId: string;
	person: PersonSummary | null;
	role: CreditRole;
	characterName: string | null;
}

export interface Movie {
	id: string;
	title: string;
	releaseYear: number | null;
	synopsis: string | null;
	artworkUrl: string | null;
	credits: MovieCredit[];
}

/** API inputs omit the resolved person object and normalize empty strings. */
export interface MovieCreditInput extends Pick<MovieCredit, 'personId' | 'role'> {
	characterName: string;
}

export interface CreateMovieInput {
	title: string;
	releaseYear: number;
	synopsis: string;
	artworkUrl: string;
	credits: MovieCreditInput[];
}

/** The edit form submits the same complete fields as the create form. */
export type UpdateMovieInput = CreateMovieInput;

/** Editor-only display data, separate from GraphQL mutation inputs. */
export interface EditableCredit extends Pick<MovieCredit, 'personId' | 'role'> {
	name: string;
	characterName?: string | null;
}
