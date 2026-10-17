
<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { graphql } from '#lib/api/graphql';
  import DetailActions from '#lib/components/DetailActions.svelte';
  import CastCrewEditor from '#lib/components/CastCrewEditor.svelte';

  interface PersonCredit {
    personId: string;
    person: { id: string; name: string } | null;
    role: string;
    characterName?: string | null;
  }

  interface Movie {
    id: string;
    title: string;
    releaseYear: number | null;
    synopsis: string | null;
    artworkUrl: string | null;
    credits: PersonCredit[];
  }

  const id = $derived(page.params.id);

  let movie = $state<Movie | null>(null);
  let form = $state({
    title: '',
    releaseYear: '',
    synopsis: '',
    artworkUrl: ''
  });

  let loading = $state(true);
  let saving = $state(false);
  let deleting = $state(false);
  let editing = $state(false);
  let error = $state('');
  let success = $state('');

  
type Role = 'ACTOR' | 'DIRECTOR' | 'WRITER' | 'PRODUCER';

interface EditableCredit {
  personId: string;
  name: string;
  role: Role;
  characterName?: string | null;
}

interface PersonOption {
  id: string;
  name: string;
}

let editingCredits = $state<EditableCredit[]>([]);
let availablePeople = $state<PersonOption[]>([]);

function resetCredits() {
  editingCredits = (movie?.credits ?? []).map((credit) => ({
    personId: credit.person.id,
    name: credit.person.name,
    role: credit.role as Role,
    characterName: credit.characterName ?? null
  }));
}

function startEdit() {
  resetForm();
  resetCredits();
  editing = true;
  error = '';
  success = '';
}

  const MOVIE_QUERY = `
    query Movie($id: ID!) {
      movie(id: $id) {
        id
        title
        releaseYear
        synopsis
        artworkUrl
        credits {
          role
          characterName
          person { id name }
        }
      }
    }
  `;

  const UPDATE_MOVIE = `
    mutation UpdateMovie($id: ID!, $input: UpdateMovieInput!) {
      updateMovie(id: $id, input: $input) {
        id
        title
        releaseYear
        synopsis
        artworkUrl
      }
    }
  `;

  const DELETE_MOVIE = `
    mutation DeleteMovie($id: ID!) {
      deleteMovie(id: $id)
    startEdit()}
  `;

  async function loadMovie(movieId: string) {
    loading = true;
    error = '';
    success = '';
    movie = null;
    editing = false;

    try {
      const data = await graphql<{ movie: Movie | null }>(
        MOVIE_QUERY,
        { id: movieId }
      );

      if (!data.movie) {
        error = 'Movie not found.';
        return;
      }

      movie = data.movie;
      resetForm();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load movie.';
    } finally {
      loading = false;
    }
  }

  const PEOPLE_QUERY = `
  query {
    people {
      id
      name
    }
  }
`;

async function loadPeople() {
  try {
    const data = await graphql<{
      people: PersonOption[];
    }>(PEOPLE_QUERY);

    availablePeople = data.people;
  } catch (e) {
    console.error('Failed to load people:', e);
  }
}

  function resetForm() {
    if (!movie) return;

    form = {
      title: movie.title,
      releaseYear: movie.releaseYear?.toString() ?? '',
      synopsis: movie.synopsis ?? '',
      artworkUrl: movie.artworkUrl ?? ''
    };
  }

  function cancelEdit() {
    resetForm();
    editing = false;
    error = '';
    resetCredits();
  }

  async function saveMovie() {
    if (!movie || !form.title.trim()) {
      error = 'Movie title is required.';
      return;
    }

    const year = form.releaseYear.trim()
      ? Number(form.releaseYear)
      : 0;

    if (
      year !== null &&
      (!Number.isInteger(year) || year < 1888 || year > 2100)
    ) {
      error = 'Enter a valid release year.';
      return;
    }

    saving = true;
    error = '';
    success = '';

    try {
      const input = {
        title: form.title.trim(),
        releaseYear: year,
        synopsis: form.synopsis.trim() || null,
        artworkUrl: form.artworkUrl.trim() || null,

        credits: editingCredits.map((credit) => ({
            personId: credit.personId,
            role: credit.role,
            characterName: credit.characterName || null
       }))
};
      const data = await graphql<{
        updateMovie: Movie;
      }>(UPDATE_MOVIE, {
        id: movie.id,
        input: input
      });

      movie = {
        ...movie,
        ...data.updateMovie
      };

      editing = false;
      success = 'Movie updated successfully.';
    } catch (e) {
      error = e instanceof Error ? e.message : 'Update failed.';
    } finally {
      saving = false;
    }
  }

  async function deleteMovie() {
    if (!movie) return;

    deleting = true;
    error = '';

    try {
      const data = await graphql<{ deleteMovie: boolean }>(
        DELETE_MOVIE,
        { id: movie.id }
      );

      if (!data.deleteMovie) {
        throw new Error('Movie could not be deleted.');
      }

      await goto('/');
    } catch (e) {
      error = e instanceof Error ? e.message : 'Delete failed.';
    } finally {
      deleting = false;
    }
  }

  // Reload when the route ID changes.
  $effect(() => {
    const movieId = id;
    if (movieId) void loadMovie(movieId);
  });
</script>

<svelte:head>
  <title>{movie?.title ?? 'Movie Details'} | Movie Manager</title>
</svelte:head>

<div class="detail-page">
  <a class="back" href="/">← Back to Movies</a>

  {#if loading}
    <p role="status">Loading movie...</p>
  {:else if movie}
    <div class="detail-header">
      <div class="poster">
        {#if movie.artworkUrl}
          <img src={movie.artworkUrl} alt={movie.title} />
        {:else}
          <div class="placeholder">🎬</div>
        {/if}
      </div>

      <div class="info">
        <h1>{movie.title}</h1>
        <p class="year">{movie.releaseYear ?? 'Unknown year'}</p>

        {#if !editing}
          <DetailActions
            onEdit={() => {
              success = '';
              editing = true;
            }}
            onDelete={deleteMovie}
            {deleting}
          />
        {/if}
      </div>
    </div>

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}

    {#if success}
      <p class="success" role="status">{success}</p>
    {/if}

    {#if editing}
      <section class="panel">
        <h2>Edit Movie</h2>

        <form onsubmit={(e) => {
          e.preventDefault();
          saveMovie();
        }}>
          <label for="title">Title *</label>
          <input
            id="title"
            bind:value={form.title}
            required
          />

          <label for="year">Release Year</label>
          <input
            id="year"
            type="number"
            min="1888"
            max="2100"
            bind:value={form.releaseYear}
          />

          <label for="artwork">Artwork URL</label>
          <input
            id="artwork"
            type="url"
            bind:value={form.artworkUrl}
          />

          <label for="synopsis">Synopsis</label>
          <textarea
            id="synopsis"
            rows="5"
            bind:value={form.synopsis}
          ></textarea>

          <CastCrewEditor
             bind:credits={editingCredits}
             people={availablePeople}
             mockMode={false}
          />

          <div class="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              class="secondary"
              onclick={cancelEdit}
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    {:else}
      <section class="panel">
        <h2>Synopsis</h2>
        <p>{movie.synopsis || 'No synopsis available.'}</p>
      </section>
    {/if}

  {:else}
    <p class="error" role="alert">{error || 'Movie not found.'}</p>
  {/if}
</div>

<style>
  .detail-page {
    max-width: 950px;
    margin: 0 auto;
  }

  .back {
    display: inline-block;
    margin-bottom: 24px;
    color: #2563eb;
    text-decoration: none;
  }

  .detail-header {
    display: flex;
    gap: 28px;
    margin-bottom: 28px;
  }

  .poster {
    width: 190px;
    flex-shrink: 0;
  }

  .poster img,
  .placeholder {
    width: 100%;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border-radius: 10px;
  }

  .placeholder {
    display: grid;
    place-items: center;
    background: #e5e7eb;
    font-size: 3rem;
  }

  .info {
    flex: 1;
  }

  h1 {
    margin: 0 0 12px;
    font-size: 2rem;
  }

  .year,
  .muted {
    color: #6b7280;
  }

  .info :global(.actions) {
    margin-top: 24px;
  }

  .panel {
    padding: 24px;
    margin-bottom: 20px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
  }

  .panel h2 {
    margin: 0 0 20px;
    font-size: 1.25rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  label {
    font-weight: 600;
    margin-top: 8px;
  }

  input,
  textarea {
    padding: 11px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font: inherit;
    width: 100%;
    box-sizing: border-box;
  }

  .form-actions {
    display: flex;
    gap: 12px;
    margin-top: 18px;
  }

  .form-actions button {
    padding: 10px 18px;
    border: none;
    border-radius: 6px;
    background: #2563eb;
    color: white;
    cursor: pointer;
  }

  .form-actions button.secondary {
    background: #e5e7eb;
    color: #111827;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .credit {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .credit a {
    color: #2563eb;
    text-decoration: none;
    font-weight: 600;
  }

  .role {
    color: #6b7280;
    font-size: 0.9rem;
  }

  .error {
    color: #dc2626;
  }

  .success {
    color: #15803d;
  }

  @media (max-width: 600px) {
    .detail-header {
      flex-direction: column;
    }

    .poster {
      width: 140px;
    }

    h1 {
      font-size: 1.6rem;
    }

    .panel {
      padding: 16px;
    }
  }
</style>

