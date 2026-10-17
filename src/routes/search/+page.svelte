
<script lang="ts">
  import { graphql } from '#lib/api/graphql';

  interface MovieSearchResult {
    id: string;
    title: string;
    releaseYear?: number | null;
    artworkUrl?: string | null;
  }

  interface PersonSearchResult {
    id: string;
    name: string;
    biography?: string | null;
  }

  const GET_MOVIES = `
    query GetMoviesForSearch {
      movies { id title releaseYear artworkUrl }
    }
  `;

  const SEARCH_PEOPLE = `
    query SearchPeople($keyword: String!) {
      searchPeople(keyword: $keyword) { id name biography }
    }
  `;

  let keyword = $state('');
  let filter = $state<'all' | 'movies' | 'people'>('all');
  let loading = $state(false);
  let searched = $state(false);
  let error = $state('');
  let movies = $state<MovieSearchResult[]>([]);
  let people = $state<PersonSearchResult[]>([]);
  let requestSequence = 0;

  async function search() {
    const query = keyword.trim();
    const sequence = ++requestSequence;

    if (!query) {
      movies = [];
      people = [];
      searched = false;
      error = '';
      loading = false;
      return;
    }

    loading = true;
    error = '';
    searched = false;

    try {
      const [movieData, personData] = await Promise.all([
        graphql<{ movies: MovieSearchResult[] }>(GET_MOVIES),
        graphql<{ searchPeople: PersonSearchResult[] }>(SEARCH_PEOPLE, { keyword: query })
      ]);

      if (sequence !== requestSequence) return;
      const normalized = query.toLocaleLowerCase();
      movies = (movieData.movies ?? []).filter((movie) =>
        movie.title.toLocaleLowerCase().includes(normalized)
      );
      people = personData.searchPeople ?? [];
      searched = true;
    } catch (e) {
      if (sequence !== requestSequence) return;
      movies = [];
      people = [];
      error = e instanceof Error ? e.message : 'Search failed. Please try again.';
    } finally {
      if (sequence === requestSequence) loading = false;
    }
  }
</script>

<svelte:head>
  <title>Search | Movie Manager</title>
</svelte:head>

<section class="search-page">
  <h1>Search Movies & People</h1>
  <p class="subtitle">
    Find movies, actors, directors and other creators.
  </p>

  <form class="search-form" onsubmit={(e) => {
    e.preventDefault();
    search();
  }}>
    <input
      type="search"
      bind:value={keyword}
      placeholder="Enter a movie or person name..."
      aria-label="Search movies and people"
    />
    <button type="submit" disabled={loading}>
      {loading ? 'Searching...' : 'Search'}
    </button>
  </form>

  <div class="filters">
    <button
      class:active={filter === 'all'}
      onclick={() => filter = 'all'}
    >All</button>

    <button
      class:active={filter === 'movies'}
      onclick={() => filter = 'movies'}
    >Movies</button>

    <button
      class:active={filter === 'people'}
      onclick={() => filter = 'people'}
    >People</button>
  </div>

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}

  {#if loading}
    <p class="hint" role="status">Searching movies and people...</p>
  {:else if searched}
    {#if filter !== 'people'}
      <section class="results">
        <h2>Movies ({movies.length})</h2>

        {#each movies as movie (movie.id)}
          <a class="result-item" href={`/movies/${movie.id}`}>
            {#if movie.artworkUrl}
              <img
                class="poster"
                src={movie.artworkUrl}
                alt={movie.title}
              />
            {:else}
              <div class="poster placeholder">🎬</div>
            {/if}

            <div class="result-info">
              <h3>{movie.title}</h3>
              <p>{movie.releaseYear ?? 'Year unknown'}</p>
              <span class="details-link">View details →</span>
            </div>
          </a>
        {:else}
          <p class="empty">No movies found.</p>
        {/each}
      </section>
    {/if}

    {#if filter !== 'movies'}
      <section class="results">
        <h2>People ({people.length})</h2>

        {#each people as person (person.id)}
          <a class="result-item" href={`/people/${person.id}`}>
            {#if person.photoUrl}
              <img
                class="avatar"
                src={person.photoUrl}
                alt={person.name}
              />
            {:else}
              <div class="avatar placeholder">👤</div>
            {/if}

            <div class="result-info">
              <h3>{person.name}</h3>
              {#if person.biography}
                <p class="biography">{person.biography}</p>
              {/if}
              <span class="details-link">View profile →</span>
            </div>
          </a>
        {:else}
          <p class="empty">No people found.</p>
        {/each}
      </section>
    {/if}
  {:else if !error}
    <p class="hint">
      Enter a keyword to search movies and people.
    </p>
  {/if}
</section>

<style>
  .search-page {
    max-width: 900px;
    margin: 0 auto;
  }

  h1 {
    margin-bottom: 8px;
  }

  .subtitle, .hint, .empty {
    color: #6b7280;
  }

  .search-form {
    display: flex;
    gap: 12px;
    margin: 28px 0 18px;
  }

  .search-form input {
    flex: 1;
    min-width: 0;
    padding: 12px 14px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
  }

  .search-form button {
    padding: 12px 24px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .search-form button:disabled {
    opacity: 0.6;
    cursor: wait;
  }

  .filters {
    display: flex;
    gap: 8px;
    margin-bottom: 28px;
  }

  .filters button {
    padding: 8px 16px;
    background: #f3f4f6;
    border: none;
    border-radius: 20px;
    cursor: pointer;
  }

  .filters button.active {
    background: #dbeafe;
    color: #1d4ed8;
    font-weight: 600;
  }

  .results {
    margin-bottom: 32px;
  }

  .results h2 {
    font-size: 1.3rem;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 12px;
  }

  .result-item {
    display: flex;
    align-items: center;
    gap: 18px;
    padding: 16px 8px;
    border-bottom: 1px solid #e5e7eb;
    color: inherit;
    text-decoration: none;
    border-radius: 6px;
  }

  .result-item:hover {
    background: #f9fafb;
  }

  .poster {
    width: 70px;
    height: 100px;
    object-fit: cover;
    border-radius: 5px;
    flex-shrink: 0;
  }

  .avatar {
    width: 70px;
    height: 70px;
    object-fit: cover;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #e5e7eb;
    font-size: 1.6rem;
  }

  .result-info h3 {
    margin: 0 0 8px;
    font-size: 1.1rem;
  }

  .biography {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .result-info p {
    color: #6b7280;
    margin: 0 0 10px;
  }

  .details-link {
    color: #2563eb;
    font-size: 0.9rem;
  }

  .error {
    color: #dc2626;
  }

  @media (max-width: 600px) {
    .search-form {
      flex-direction: column;
    }

    .search-form button {
      width: 100%;
    }
  }
</style>

