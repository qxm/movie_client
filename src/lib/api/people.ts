import { graphql } from './graphql';

export interface Person {
    id: string;
    name: string;
    biography: string;
}

export interface CreatePersonInput {
    name: string;
    biography: string;
}

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

export async function createPerson(
    input: CreatePersonInput
): Promise<Person> {
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
