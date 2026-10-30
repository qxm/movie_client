export interface Person {
	id: string;
	name: string;
	biography: string | null;
	photoUrl: string | null;
}

/** Fields selected by person search controls and movie-credit resolvers. */
export type PersonSummary = Pick<Person, 'id' | 'name'> & Partial<Pick<Person, 'photoUrl'>>;

export interface CreatePersonInput {
	name: string;
	biography: string;
	photoUrl?: string | null;
}

export interface UpdatePersonInput {
	name: string;
	biography?: string | null;
	/** Omit to preserve the photo; send an empty string to remove it. */
	photoUrl?: string | null;
}
