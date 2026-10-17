
export interface MovieSearchResult {
  id: string;
  title: string;
  releaseYear?: number | null;
  artworkUrl?: string | null;
}

export interface PersonSearchResult {
  id: string;
  name: string;
  knownAs?: string | null;
  photoUrl?: string | null;
}

export interface SearchResult {
  movies: MovieSearchResult[];
  people: PersonSearchResult[];
}

