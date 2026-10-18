export interface Person {
	id: string;
	name: string;
	biography: string | null;
}

/** Fields selected by person search controls and movie-credit resolvers. */
export type PersonSummary = Pick<Person, 'id' | 'name'>;

export interface CreatePersonInput {
	name: string;
	biography: string;
}

export interface UpdatePersonInput {
	name: string;
	biography?: string | null;
}
