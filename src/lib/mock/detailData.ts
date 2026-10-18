import type {
	Movie as SharedMovie,
	Person as SharedPerson,
	PersonSummary,
	CreditRole
} from '#lib/types';

// Legacy mock credits contain a person object rather than the API's personId field.
export interface PersonCredit {
	person: PersonSummary;
	role: CreditRole;
	characterName?: string | null;
}

export interface Movie extends Omit<SharedMovie, 'credits'> {
	credits: PersonCredit[];
}

export interface FilmCredit {
	movie: Pick<SharedMovie, 'id' | 'title' | 'releaseYear'>;
	role: CreditRole;
	characterName?: string | null;
}

export interface Person extends SharedPerson {
	knownAs: string | null;
	photoUrl: string | null;
	filmography: FilmCredit[];
}

// Movie Mock Data
export const mockMovies: Movie[] = [
	{
		id: '1',
		title: 'The Shawshank Redemption',
		releaseYear: 1994,
		synopsis:
			'Andy Dufresne, a banker, is sentenced to life in Shawshank State Penitentiary. During his years in prison, he develops an enduring friendship with Ellis "Red" Redding and maintains hope for a better future.',
		artworkUrl: '/images/shawshank.webp',
		credits: [
			{
				person: { id: '1', name: 'Morgan Freeman' },
				role: 'ACTOR',
				characterName: 'Ellis Boyd Redding'
			},
			{
				person: { id: '2', name: 'Tim Robbins' },
				role: 'ACTOR',
				characterName: 'Andy Dufresne'
			},
			{
				person: { id: '3', name: 'Frank Darabont' },
				role: 'DIRECTOR'
			}
		]
	},
	{
		id: '2',
		title: 'The Dark Knight',
		releaseYear: 2008,
		synopsis:
			'Batman faces a dangerous new adversary, the Joker, whose actions challenge the people of Gotham City.',
		artworkUrl: '/images/dark-knight.webp',
		credits: [
			{
				person: { id: '4', name: 'Christian Bale' },
				role: 'ACTOR',
				characterName: 'Bruce Wayne / Batman'
			},
			{
				person: { id: '5', name: 'Christopher Nolan' },
				role: 'DIRECTOR'
			}
		]
	}
];

// Person Mock Data
export const mockPeople: Person[] = [
	{
		id: '1',
		name: 'Morgan Freeman',
		knownAs: null,
		photoUrl: '/images/morgan-freeman.webp',
		biography:
			'Morgan Freeman is an American actor, producer and narrator. He is known for his distinctive voice and performances across a wide range of film genres.',
		filmography: [
			{
				movie: {
					id: '1',
					title: 'The Shawshank Redemption',
					releaseYear: 1994
				},
				role: 'ACTOR',
				characterName: 'Ellis Boyd Redding'
			}
		]
	},
	{
		id: '2',
		name: 'Tim Robbins',
		knownAs: 'Timothy Francis Robbins',
		photoUrl: '/images/tim-robbins.webp',
		biography:
			'Tim Robbins is an American actor, director and screenwriter, known for his performances in drama and comedy films.',
		filmography: [
			{
				movie: {
					id: '1',
					title: 'The Shawshank Redemption',
					releaseYear: 1994
				},
				role: 'ACTOR',
				characterName: 'Andy Dufresne'
			}
		]
	},
	{
		id: '3',
		name: 'Frank Darabont',
		knownAs: null,
		photoUrl: '/images/frank-darabont.webp',
		biography:
			'Frank Darabont is an American filmmaker and screenwriter known for directing The Shawshank Redemption and The Green Mile.',
		filmography: [
			{
				movie: {
					id: '1',
					title: 'The Shawshank Redemption',
					releaseYear: 1994
				},
				role: 'DIRECTOR'
			}
		]
	},
	{
		id: '4',
		name: 'Christian Bale',
		knownAs: null,
		photoUrl: '/images/christian-bale.webp',
		biography:
			'Christian Bale is an actor known for his versatile performances, including his portrayal of Bruce Wayne in The Dark Knight trilogy.',
		filmography: [
			{
				movie: {
					id: '2',
					title: 'The Dark Knight',
					releaseYear: 2008
				},
				role: 'ACTOR',
				characterName: 'Bruce Wayne / Batman'
			}
		]
	},
	{
		id: '5',
		name: 'Christopher Nolan',
		knownAs: null,
		photoUrl: '/images/christopher-nolan.webp',
		biography:
			'Christopher Nolan is a filmmaker known for directing films including The Dark Knight, Inception and Interstellar.',
		filmography: [
			{
				movie: {
					id: '2',
					title: 'The Dark Knight',
					releaseYear: 2008
				},
				role: 'DIRECTOR'
			}
		]
	}
];

export function getMockMovie(id: string): Movie | null {
	return mockMovies.find((movie) => movie.id === id) ?? null;
}

export function getMockPerson(id: string): Person | null {
	return mockPeople.find((person) => person.id === id) ?? null;
}
