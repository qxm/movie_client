
<script lang="ts">
  import { onDestroy } from 'svelte';
  import AddPersonModal from '#lib/components/AddPersonModal.svelte';
  import { personStore } from '#lib/mock/personStore.svelte';

  type Role = 'ACTOR' | 'DIRECTOR' | 'WRITER' | 'PRODUCER';

  interface Person {
    id: string;
    name: string;
  }


  interface MovieCredit {
     personId: string;
     name: string;
     role: Role;
     characterName?: string;
  }

  let showAddPerson = $state(false);

  let credits = $state<MovieCredit[]>([]);

  function handlePersonAdded(person: {
    id: string;
    name: string;
    role: Role;
    characterName?: string;
  }) {
    credits = [
      ...credits,
      {
        personId: person.id,
        name: person.name,
        role: person.role,
        characterName: person.characterName
      }
    ];

    showAddPerson = false;
  }

  function removeCredit(index: number) {
    credits = credits.filter((_, i) => i !== index);
  }

  interface MovieInput {
    title: string;
    description: string;
    releaseYear: number | null;
    artworkUrl: string | null;
    credits: {
      personId: string;
      role: Role;
      characterName?: string;
    }[];
  }

  const GRAPHQL_URL = '/graphql';
  const ARTWORK_URL = '/api/artworks';

  let title = '';
  let description = '';
  let releaseYear = '';
  let artworkUrl: string | null = null;
  let artworkId: string | null = null;

  let selectedFile: File | null = null;
  let previewUrl = '';
  let uploading = false;
  let saving = false;
  let errorMessage = '';
  let successMessage = '';

  let searchQuery = '';
  let searchResults: Person[] = [];
  let searching = false;

  let newPersonName = '';
  let creatingPerson = false;

  let pendingRole: Role = 'ACTOR';

  const roles: { value: Role; label: string }[] = [
    { value: 'ACTOR', label: 'Actor' },
    { value: 'DIRECTOR', label: 'Director' },
    { value: 'WRITER', label: 'Writer' },
    { value: 'PRODUCER', label: 'Producer' }
  ];

  async function graphql<T>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables })
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const result = await response.json();

    if (result.errors?.length) {
      throw new Error(result.errors[0].message);
    }

    return result.data as T;
  }

  function handleFileChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    errorMessage = '';
    successMessage = '';

    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.type)) {
      errorMessage = 'Please select a JPG, PNG or WebP image.';
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      errorMessage = 'Image size must not exceed 5 MB.';
      input.value = '';
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);

    selectedFile = file;
    previewUrl = URL.createObjectURL(file);

    // Upload only when the user selects a file.
    // The returned URL is associated with the movie when saved.
    void uploadArtwork(file);
  }

  async function uploadArtwork(file: File) {
    uploading = true;
    artworkUrl = null;
    artworkId = null;
    errorMessage = '';

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(ARTWORK_URL, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const result: {
        artworkId?: string;
        url: string;
      } = await response.json();

      artworkUrl = result.url;
      artworkId = result.artworkId ?? null;
    } catch (error) {
      errorMessage = error instanceof Error
        ? error.message
        : 'Unable to upload artwork.';
    } finally {
      uploading = false;
    }
  }

  async function searchPeople() {
    if (!searchQuery.trim()) {
      searchResults = [];
      return;
    }

    searching = true;

    try {
      const data = await graphql<{
        searchPeople: Person[];
      }>(
        `query SearchPeople($query: String!) {
          searchPeople(query: $query) {
            id
            name
          }
        }`,
        { query: searchQuery.trim() }
      );

      searchResults = data.searchPeople;
    } catch (error) {
      errorMessage = error instanceof Error
        ? error.message
        : 'Unable to search people.';
    } finally {
      searching = false;
    }
  }

  function addCredit(person: Person) {
    const exists = credits.some(
      (credit) =>
        credit.person.id === person.id &&
        credit.role === pendingRole
    );

    if (!exists) {
      credits = [
        ...credits,
        {
          person,
          role: pendingRole,
          characterName: ''
        }
      ];
    }

    searchQuery = '';
    searchResults = [];
  }


  async function createPerson() {
    if (!newPersonName.trim()) return;

    creatingPerson = true;
    errorMessage = '';

    try {
      const data = await graphql<{
        createPerson: Person;
      }>(
        `mutation CreatePerson($input: CreatePersonInput!) {
          createPerson(input: $input) {
            id
            name
          }
        }`,
        {
          input: { name: newPersonName.trim() }
        }
      );

      addCredit(data.createPerson);
      newPersonName = '';
      showAddPerson = false;
    } catch (error) {
      errorMessage = error instanceof Error
        ? error.message
        : 'Unable to create person.';
    } finally {
      creatingPerson = false;
    }
  }

  async function saveMovie(event: SubmitEvent) {
    event.preventDefault();

    errorMessage = '';
    successMessage = '';

    if (!title.trim()) {
      errorMessage = 'Movie title is required.';
      return;
    }

    if (uploading) {
      errorMessage = 'Please wait for the artwork upload to finish.';
      return;
    }

    if (selectedFile && !artworkUrl) {
      errorMessage = 'Please resolve the artwork upload error first.';
      return;
    }

    if (
      releaseYear &&
      (!Number.isInteger(Number(releaseYear)) ||
        Number(releaseYear) < 1888 ||
        Number(releaseYear) > new Date().getFullYear() + 10)
    ) {
      errorMessage = 'Please enter a valid release year.';
      return;
    }

    saving = true;

    try {
      const input: MovieInput = {
        title: title.trim(),
        description: description.trim(),
        releaseYear: releaseYear ? Number(releaseYear) : null,
        artworkUrl,
        credits: credits.map((credit) => ({
          personId: credit.person.id,
          role: credit.role,
          ...(credit.characterName.trim()
            ? { characterName: credit.characterName.trim() }
            : {})
        }))
      };

      await graphql(
        `mutation CreateMovie($input: CreateMovieInput!) {
          createMovie(input: $input) {
            id
            title
          }
        }`,
        { input }
      );

      successMessage = 'Movie created successfully.';

      title = '';
      description = '';
      releaseYear = '';
      artworkUrl = null;
      artworkId = null;
      selectedFile = null;
      credits = [];

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = '';
    } catch (error) {
      errorMessage = error instanceof Error
        ? error.message
        : 'Unable to save movie.';
    } finally {
      saving = false;
    }
  }

  onDestroy(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  });
</script>

<svelte:head>
  <title>Add Movie | MovieHub</title>
  <meta
    name="description"
    content="Add a movie and manage its cast and crew."
  />
</svelte:head>

<main class="page">
  <header class="page-header">
    <div>
      <p class="eyebrow">MOVIE MANAGEMENT</p>
      <h1>Add Movie</h1>
      <p class="subtitle">
        Enter movie details, upload artwork and add cast and crew.
      </p>
    </div>
  </header>

  {#if errorMessage}
    <div class="notice error" role="alert">
      {errorMessage}
    </div>
  {/if}

  {#if successMessage}
    <div class="notice success" role="status">
      {successMessage}
    </div>
  {/if}

  <form onsubmit={saveMovie}>
    <section class="panel">
      <h2>Movie Information</h2>

      <div class="form-grid">
        <div class="field">
          <label for="title">Movie Title *</label>
          <input
            id="title"
            bind:value={title}
            required
            maxlength="255"
            placeholder="e.g. Inception"
          />
        </div>

        <div class="field">
          <label for="year">Release Year</label>
          <input
            id="year"
            type="number"
            bind:value={releaseYear}
            min="1888"
            max={new Date().getFullYear() + 10}
            placeholder="e.g. 2010"
          />
        </div>
      </div>

      <div class="field">
        <label for="description">Synopsis</label>
        <textarea
          id="description"
          bind:value={description}
          rows="4"
          maxlength="5000"
          placeholder="Brief description of the movie..."
        ></textarea>
      </div>
    </section>

    <section class="panel">
      <h2>Movie Artwork</h2>
      <p class="help">
        JPG, PNG or WebP. Maximum size: 5 MB.
      </p>

      <div class="artwork-layout">
        <div class="poster">
          {#if previewUrl}
            <img src={previewUrl} alt="Movie poster preview" />
          {:else}
            <div class="empty-poster">
              <span aria-hidden="true">▧</span>
              <p>No poster selected</p>
            </div>
          {/if}
        </div>

        <div class="upload-controls">
          <label class="file-button" for="artwork">
            Choose Image
          </label>

          <input
            id="artwork"
            class="visually-hidden"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onchange={handleFileChange}
            disabled={uploading || saving}
          />

          {#if selectedFile}
            <p class="file-name">{selectedFile.name}</p>
          {/if}

          {#if uploading}
            <p class="status">
              Uploading artwork...
            </p>
            <progress></progress>
          {:else if artworkUrl}
            <p class="status">Artwork uploaded successfully.</p>
          {/if}
        </div>
      </div>
    </section>

    <section class="panel">
      <h2>Cast & Crew</h2>
      <p class="help">
        Search existing people or create a new person.
      </p>

      <div class="field">
        <label for="role">Credit Type</label>
        <select bind:value={pendingRole} id="role">
          {#each roles as role}
            <option value={role.value}>{role.label}</option>
          {/each}
        </select>
      </div>

      <div class="search-row">
        <input
          bind:value={searchQuery}
          placeholder="Search by person's name..."
          aria-label="Search people"
          onkeydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void searchPeople();
            }
          }}
        />
        <button
          type="button"
          class="secondary"
          onclick={() => void searchPeople()}
          disabled={searching}
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {#if searchResults.length > 0}
        <div class="results">
          {#each searchResults as person (person.id)}
            <button
              type="button"
              class="person-result"
              onclick={() => addCredit(person)}
            >
              <span>{person.name}</span>
              <span>+ Add</span>
            </button>
          {/each}
        </div>
      {/if}

      <button
        type="button"
        class="text-button"
        onclick={() => {
          newPersonName = searchQuery.trim();
          showAddPerson = true;
        }}
      >
        + Add New Person
      </button>

      {#if showAddPerson}
        <div class="inline-form">
          <label for="new-person">Person Name *</label>
          <input
            id="new-person"
            bind:value={newPersonName}
            maxlength="255"
            placeholder="Enter full name"
          />

          <div class="button-row">
            <button
              type="button"
              class="secondary"
              onclick={() => showAddPerson = false}
            >
              Cancel
            </button>
            <button
              type="button"
              onclick={() => void createPerson()}
              disabled={creatingPerson || !newPersonName.trim()}
            >
              {creatingPerson ? 'Creating...' : 'Create Person'}
            </button>
          </div>
        </div>
      {/if}

      {#if credits.length > 0}
        <h3>Selected Credits ({credits.length})</h3>

        <div class="credit-list">
          {#each credits as credit, index}
            <div class="credit-row" key={`${credit.person.id}-${credit.role}`}>
              <div class="credit-person">
                <strong>{credit.person.name}</strong>
                <span>{credit.role}</span>
              </div>

              {#if credit.role === 'ACTOR'}
                <input
                  class="character-input"
                  bind:value={credit.characterName}
                  placeholder="Character name (optional)"
                  aria-label={`Character name for ${credit.person.name}`}
                />
              {/if}

              <button
                type="button"
                class="remove-button"
                aria-label={`Remove ${credit.person.name}`}
                onclick={() => removeCredit(index)}
              >
                Remove
              </button>
            </div>
          {/each}
        </div>
      {:else}
        <p class="empty-credits">
          No cast or crew added yet. This section is optional.
        </p>
      {/if}
    </section>

    <footer class="form-footer">
      <button
        type="button"
        class="secondary"
        onclick={() => history.back()}
        disabled={saving}
      >
        Cancel
      </button>

      <button type="submit" disabled={saving || uploading}>
        {saving ? 'Saving Movie...' : 'Save Movie'}
      </button>
    </footer>
  </form>
</main>

<style>
  :global(*) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    background: #f5f7fb;
    color: #1d2939;
    font-family: Inter, system-ui, sans-serif;
  }

  .page {
    max-width: 920px;
    margin: 0 auto;
    padding: 36px 24px 64px;
  }

  .page-header {
    margin-bottom: 28px;
  }

  .eyebrow {
    color: #5269bd;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 1.5px;
  }

  h1 {
    margin: 8px 0;
    font-size: clamp(28px, 4vw, 36px);
  }

  h2 {
    margin: 0 0 20px;
    font-size: 19px;
  }

  h3 {
    font-size: 15px;
    margin-top: 24px;
  }

  .subtitle,
  .help {
    color: #667085;
    font-size: 14px;
    line-height: 1.6;
  }

  .panel {
    background: white;
    border: 1px solid #e4e7ec;
    border-radius: 14px;
    padding: 24px;
    margin-bottom: 20px;
    box-shadow: 0 3px 12px #10182808;
  }

  .form-grid {
    display: grid;
    grid-template-columns: 2fr 1fr;
    gap: 18px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }

  label {
    font-size: 14px;
    font-weight: 600;
  }

  input,
  textarea,
  select {
    width: 100%;
    min-width: 0;
    padding: 11px 12px;
    border: 1px solid #d0d5dd;
    border-radius: 8px;
    background: white;
    color: #1d2939;
    font: inherit;
    font-size: 14px;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: 2px solid #c7d2fe;
    border-color: #667eea;
  }

  textarea {
    resize: vertical;
  }

  .artwork-layout {
    display: flex;
    gap: 24px;
    align-items: flex-start;
  }

  .poster {
    width: 150px;
    aspect-ratio: 2 / 3;
    flex-shrink: 0;
    overflow: hidden;
    border: 1px dashed #cbd5e1;
    border-radius: 10px;
    background: #f8fafc;
  }

  .poster img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .empty-poster {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: #98a2b3;
    font-size: 13px;
  }

  .empty-poster span {
    font-size: 36px;
  }

  .upload-controls {
    flex: 1;
    min-width: 0;
  }

  .file-button,
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 40px;
    padding: 10px 16px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: #3659d9;
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .secondary {
    background: white;
    color: #344054;
    border-color: #d0d5dd;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
  }

  .file-name {
    overflow-wrap: anywhere;
    color: #667085;
    font-size: 13px;
  }

  .status {
    color: #475467;
    font-size: 13px;
  }

  progress {
    width: 100%;
  }

  .search-row {
    display: flex;
    gap: 10px;
  }

  .search-row input {
    flex: 1;
  }

  .results {
    margin-top: 10px;
    border: 1px solid #e4e7ec;
    border-radius: 8px;
    overflow: hidden;
  }

  .person-result {
    width: 100%;
    display: flex;
    justify-content: space-between;
    border-radius: 0;
    border-bottom: 1px solid #eaecf0;
    background: white;
    color: #344054;
    text-align: left;
  }

  .person-result:last-child {
    border-bottom: 0;
  }

  .person-result span:last-child {
    color: #3659d9;
  }

  .text-button {
    margin-top: 14px;
    padding: 4px 0;
    min-height: auto;
    background: transparent;
    color: #3659d9;
  }

  .inline-form {
    display: grid;
    gap: 12px;
    margin-top: 16px;
    padding: 16px;
    border: 1px solid #e4e7ec;
    border-radius: 10px;
    background: #f9fafb;
  }

  .button-row,
  .form-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .credit-list {
    display: grid;
    gap: 10px;
  }

  .credit-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    padding: 12px;
    border: 1px solid #eaecf0;
    border-radius: 9px;
  }

  .credit-person {
    display: flex;
    flex: 1;
    min-width: 120px;
    flex-direction: column;
    gap: 4px;
  }

  .credit-person strong {
    font-size: 14px;
  }

  .credit-person span {
    color: #667085;
    font-size: 12px;
  }

  .character-input {
    max-width: 220px;
  }

  .remove-button {
    background: transparent;
    color: #b42318;
    padding: 8px;
  }

  .empty-credits {
    color: #667085;
    font-size: 14px;
  }

  .form-footer {
    padding-top: 4px;
  }

  .notice {
    margin-bottom: 18px;
    padding: 13px 16px;
    border-radius: 8px;
    font-size: 14px;
  }

  .error {
    background: #fef3f2;
    color: #b42318;
  }

  .success {
    background: #ecfdf3;
    color: #027a48;
  }

  @media (max-width: 600px) {
    .page {
      padding: 24px 14px 40px;
    }

    .panel {
      padding: 18px;
    }

    .form-grid {
      grid-template-columns: 1fr;
      gap: 0;
    }

    .artwork-layout {
      gap: 16px;
    }

    .poster {
      width: 110px;
    }

    .search-row {
      flex-direction: column;
    }

    .search-row button {
      width: 100%;
    }

    .credit-row {
      align-items: stretch;
    }

    .character-input {
      max-width: none;
    }

    .form-footer button {
      flex: 1;
    }
  }
</style>

