
export interface Person {
  id: string;
  name: string;
  knownAs: string | null;
  biography: string | null;
  photoUrl: string | null;
}

export interface CreatePersonInput {
  name: string;
  knownAs?: string | null;
  biography?: string | null;
  photoUrl?: string | null;
}

const initialPeople: Person[] = [
  {
    id: '1',
    name: 'Morgan Freeman',
    knownAs: null,
    biography: 'American actor and narrator.',
    photoUrl: null
  },
  {
    id: '2',
    name: 'Tim Robbins',
    knownAs: null,
    biography: 'American actor and filmmaker.',
    photoUrl: null
  },
  {
    id: '3',
    name: 'Frank Darabont',
    knownAs: null,
    biography: 'American film director and screenwriter.',
    photoUrl: null
  }
];

// Reactive store, shared within the browser.
let people = $state<Person[]>([...initialPeople]);

export const personStore = {
  get people() {
    return people;
  },

  getById(id: string) {
    return people.find((person) => person.id === id);
  },

  search(keyword: string) {
    const q = keyword.trim().toLowerCase();

    if (!q) return [];

    return people.filter(
      (person) =>
        person.name.toLowerCase().includes(q) ||
        (person.knownAs?.toLowerCase().includes(q) ?? false)
    );
  },

  create(input: CreatePersonInput): Person {
    const name = input.name.trim();

    if (!name) {
      throw new Error('Person name is required.');
    }

    const person: Person = {
      id: crypto.randomUUID(),
      name,
      knownAs: input.knownAs?.trim() || null,
      biography: input.biography?.trim() || null,
      photoUrl: input.photoUrl?.trim() || null
    };

    people = [...people, person];

    return person;
  }
};

