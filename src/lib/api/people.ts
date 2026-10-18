import { graphql } from './graphql';
import type { Person, CreatePersonInput } from '#lib/types';

// Preserve existing API-module type imports for callers.
export type { Person, CreatePersonInput } from '#lib/types';

export async function getPeople(): Promise<Person[]> {
	const data = await graphql<{ people: Person[] }>(`
		query {
			people {
				id
				name
				biography
			}
		}
	`);

	return data.people;
}

export async function createPerson(input: CreatePersonInput): Promise<Person> {
	const data = await graphql<{ createPerson: Person }>(
		`
			mutation CreatePerson($input: CreatePersonInput!) {
				createPerson(input: $input) {
					id
					name
					biography
				}
			}
		`,
		{ input }
	);

	return data.createPerson;
}
