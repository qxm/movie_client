
<script lang="ts">
  import { goto } from '$app/navigation';
  import { onDestroy } from 'svelte';
  import AddPersonModal from '#lib/components/AddPersonModal.svelte';
  import { personStore } from '#lib/mock/personStore.svelte';

  type Role = 'ACTOR' | 'DIRECTOR' | 'WRITER' | 'PRODUCER';

  interface MovieCredit {
    personId: string;
    name: string;
    role: Role;
    characterName?: string;
  }

  interface MockMovie {
    id: string;
    title: string;
    releaseYear: number | null;
    synopsis: string | null;
    artworkUrl: string | null;
    credits: MovieCredit[];
  }

  // Current development mode
  const mode = 'mock';

  // Movie form
  let title = $state('');
  let releaseYear = $state('');
  let synopsis = $state('');

  // Artwork
  let artworkFile = $state<File | null>(null);
  let artworkPreview = $state<string | null>(null);

  // Cast & Crew
  let credits = $state<MovieCredit[]>([]);
  let personKeyword = $state('');
  let selectedPersonId = $state('');
  let selectedRole = $state<Role>('ACTOR');
  let characterName = $state('');

  // Modal
  let showAddPerson = $state(false);

  // UI state
  let saving = $state(false);
  let error = $state('');
  let success = $state('');

  // Search existing people from mock store
  let searchResults = $derived(
    personStore.search(personKeyword)
  );

  // Selected person
  let selectedPerson = $derived(
    personStore.getById(selectedPersonId)
  );

  function handleArtworkChange(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp'
    ];

    if (!allowedTypes.includes(file.type)) {
      error = 'Please select a JPG, PNG or WebP image.';
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      error = 'Artwork must be smaller than 5 MB.';
      input.value = '';
      return;
    }

    if (artworkPreview) {
      URL.revokeObjectURL(artworkPreview);
    }

    artworkFile = file;
    artworkPreview = URL.createObjectURL(file);
    error = '';
  }

  function addExistingPerson() {
    if (!selectedPerson) {
      error = 'Please select a person.';
      return;
    }

    const exists = credits.some(
      (credit) =>
        credit.personId === selectedPerson.id &&
        credit.role === selectedRole &&
        credit.characterName ===
          (selectedRole === 'ACTOR' ? characterName.trim() : '')
    );

    if (exists) {
      error = 'This person has already been added with the same role.';
      return;
    }

    credits = [
      ...credits,
      {
        personId: selectedPerson.id,
        name: selectedPerson.name,
        role: selectedRole,
        characterName:
          selectedRole === 'ACTOR'
            ? characterName.trim() || undefined
            : undefined
      }
    ];

    personKeyword = '';
    selectedPersonId = '';
    selectedRole = 'ACTOR';
    characterName = '';
    error = '';
  }

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
    error = '';
  }

  function removeCredit(index: number) {
    credits = credits.filter((_, i) => i !== index);
  }

  function validateMovie(): boolean {
    if (!title.trim()) {
      error = 'Movie title is required.';
      return false;
    }

    if (releaseYear.trim()) {
      const year = Number(releaseYear);

      if (
        !Number.isInteger(year) ||
        year < 1888 ||
        year > 2200
      ) {
        error = 'Please enter a valid release year.';
        return false;
      }
    }

    error = '';
    return true;
  }

  async function saveMovie() {
    if (!validateMovie()) return;

    saving = true;
    error = '';
    success = '';

    try {
      const movie: MockMovie = {
        id: crypto.randomUUID(),
        title: title.trim(),
        releaseYear: releaseYear.trim()
          ? Number(releaseYear)
          : null,
        synopsis: synopsis.trim() || null,
        artworkUrl: null,
        credits: [...credits]
      };

      if (mode === 'mock') {
        // Simulate backend processing
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Temporary mock storage
        // Note: artworkFile is not persisted here.
        const storedMovies: MockMovie[] = JSON.parse(
          localStorage.getItem('mockMovies') || '[]'
        );

        storedMovies.push(movie);

        localStorage.setItem(
          'mockMovies',
          JSON.stringify(storedMovies)
        );

        success = 'Movie created successfully (Mock Mode).';

        await new Promise((resolve) => setTimeout(resolve, 500));
        await goto('/');
      }
    } catch (e) {
      error = e instanceof Error
        ? e.message
        : 'Failed to create movie.';
    } finally {
      saving = false;
    }
  }

  onDestroy(() => {
    if (artworkPreview) {
      URL.revokeObjectURL(artworkPreview);
    }
  });
</script>

<svelte:head>
  <title>Add Movie | Movie Manager</title>
  <meta
    name="description"
    content="Add a new movie and manage its cast and crew."
  />
</svelte:head>

<div class="page">
  <div class="page-header">
    <div>
      <h1>Add Movie</h1>
      <p>Create a new movie and add cast and crew members.</p>
    </div>

    <span class="mode-badge">Mock Mode</span>
  </div>

  {#if error}
    <div class="alert error" role="alert">
      {error}
    </div>
  {/if}

  {#if success}
    <div class="alert success" role="status">
      {success}
    </div>
  {/if}

  <form
    onsubmit={(event) => {
      event.preventDefault();
      saveMovie();
    }}
  >
    <!-- Movie Information -->
    <section class="panel">
      <h2>Movie Information</h2>

      <div class="field">
        <label for="movie-title">Movie Title *</label>
        <input
          id="movie-title"
          bind:value={title}
          placeholder="e.g. The Shawshank Redemption"
          required
        />
      </div>

      <div class="field">
        <label for="release-year">Release Year</label>
        <input
          id="release-year"
          type="number"
          min="1888"
          max="2200"
          bind:value={releaseYear}
          placeholder="e.g. 1994"
        />
      </div>

      <div class="field">
        <label for="synopsis">Synopsis</label>
        <textarea
          id="synopsis"
          bind:value={synopsis}
          rows="5"
          placeholder="Write a short description of the movie..."
        ></textarea>
      </div>
    </section>

    <!-- Artwork -->
    <section class="panel">
      <h2>Movie Artwork</h2>

      <div class="artwork-layout">
        <div class="artwork-preview">
          {#if artworkPreview}
            <img src={artworkPreview} alt="Artwork preview" />
          {:else}
            <div class="artwork-placeholder">
              <span>🎬</span>
              <p>No artwork selected</p>
            </div>
          {/if}
        </div>

        <div class="artwork-controls">
          <label for="artwork-file">Upload Artwork</label>

          <input
            id="artwork-file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onchange={handleArtworkChange}
          />

          <p class="hint">
            JPG, PNG or WebP. Maximum file size: 5 MB.
          </p>

          {#if artworkFile}
            <p class="file-name">
              Selected: {artworkFile.name}
            </p>
          {/if}
        </div>
      </div>
    </section>

    <!-- Cast & Crew -->
    <section class="panel">
      <div class="section-header">
        <div>
          <h2>Cast & Crew</h2>
          <p class="hint">
            Search existing people or create a new person.
          </p>
        </div>

        <button
          type="button"
          class="add-person-btn"
          onclick={() => showAddPerson = true}
        >
          + Add New Person
        </button>
      </div>

      <!-- Search Existing Person -->
      <div class="person-search">
        <div class="field">
          <label for="person-search">
            Search Existing Person
          </label>

          <input
            id="person-search"
            type="search"
            bind:value={personKeyword}
            placeholder="Search by name..."
            oninput={() => selectedPersonId = ''}
          />
        </div>

        {#if personKeyword.trim()}
          <div class="search-results">
            {#each searchResults as person (person.id)}
              <button
                type="button"
                class:selected={selectedPersonId === person.id}
                onclick={() => {
                  selectedPersonId = person.id;
                  personKeyword = person.name;
                }}
              >
                <span>{person.name}</span>

                {#if person.knownAs}
                  <small>{person.knownAs}</small>
                {/if}
              </button>
            {:else}
              <p class="no-results">
                No matching people found.
              </p>
            {/each}
          </div>
        {/if}

        {#if selectedPerson}
          <div class="selected-person">
            Selected: <strong>{selectedPerson.name}</strong>
          </div>

          <div class="role-fields">
            <div class="field">
              <label for="person-role">Role</label>
              <select id="person-role" bind:value={selectedRole}>
                <option value="ACTOR">Actor</option>
                <option value="DIRECTOR">Director</option>
                <option value="WRITER">Writer</option>
                <option value="PRODUCER">Producer</option>
              </select>
            </div>

            {#if selectedRole === 'ACTOR'}
              <div class="field">
                <label for="character-name">
                  Character Name
                </label>
                <input
                  id="character-name"
                  bind:value={characterName}
                  placeholder="e.g. Andy Dufresne"
                />
              </div>
            {/if}
          </div>

          <button
            type="button"
            class="secondary-btn"
            onclick={addExistingPerson}
          >
            + Add to Movie
          </button>
        {/if}
      </div>

      <!-- Selected Credits -->
      <div class="selected-credits">
        <h3>Selected People ({credits.length})</h3>

        {#if credits.length === 0}
          <p class="empty">
            No cast or crew added yet.
          </p>
        {:else}
          <div class="credits-list">
            {#each credits as credit, index (index)}
              <div class="credit-item">
                <div class="credit-info">
                  <strong>{credit.name}</strong>

                  <span>
                    {credit.role}
                    {#if credit.characterName}
                      · {credit.characterName}
                    {/if}
                  </span>
                </div>

                <button
                  type="button"
                  class="remove-btn"
                  aria-label={`Remove ${credit.name}`}
                  onclick={() => removeCredit(index)}
                >
                  Remove
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </section>

    <!-- Form Actions -->
    <div class="form-actions">
      <a class="cancel-link" href="/">Cancel</a>

      <button
        type="submit"
        class="save-btn"
        disabled={saving}
      >
        {saving ? 'Saving Movie...' : 'Save Movie'}
      </button>
    </div>
  </form>
</div>

<!-- Keep the modal outside the movie form -->
{#if showAddPerson}
  <AddPersonModal
    mode="mock"
    onCancel={() => showAddPerson = false}
    onAdded={handlePersonAdded}
  />
{/if}

<style>
  .page {
    max-width: 950px;
    margin: 0 auto;
    padding-bottom: 50px;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 28px;
  }

  h1 {
    margin: 0 0 8px;
    font-size: 2rem;
    color: #111827;
  }

  .page-header p {
    margin: 0;
    color: #6b7280;
  }

  .mode-badge {
    padding: 7px 12px;
    background: #dbeafe;
    color: #1d4ed8;
    border-radius: 20px;
    font-size: 0.8rem;
    font-weight: 600;
    white-space: nowrap;
  }

  .panel {
    padding: 26px;
    margin-bottom: 24px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
  }

  .panel h2 {
    margin: 0 0 22px;
    font-size: 1.3rem;
    color: #111827;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 20px;
  }

  label {
    font-weight: 600;
    font-size: 0.9rem;
    color: #374151;
  }

  input,
  textarea,
  select {
    width: 100%;
    box-sizing: border-box;
    padding: 12px 14px;
    border: 1px solid #d1d5db;
    border-radius: 7px;
    font: inherit;
    background: white;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: 2px solid #bfdbfe;
    border-color: #2563eb;
  }

  .artwork-layout {
    display: flex;
    align-items: flex-start;
    gap: 28px;
  }

  .artwork-preview {
    width: 180px;
    flex-shrink: 0;
  }

  .artwork-preview img,
  .artwork-placeholder {
    width: 100%;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border-radius: 8px;
  }

  .artwork-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #f3f4f6;
    color: #9ca3af;
    text-align: center;
  }

  .artwork-placeholder span {
    font-size: 2.5rem;
  }

  .artwork-placeholder p {
    font-size: 0.85rem;
  }

  .artwork-controls {
    flex: 1;
  }

  .artwork-controls input {
    margin-top: 12px;
  }

  .hint {
    color: #6b7280;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .file-name {
    color: #2563eb;
    font-size: 0.9rem;
    overflow-wrap: anywhere;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 24px;
  }

  .section-header h2 {
    margin-bottom: 6px;
  }

  .section-header p {
    margin: 0;
  }

  .add-person-btn {
    padding: 11px 16px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 7px;
    cursor: pointer;
    white-space: nowrap;
  }

  .person-search {
    padding: 20px;
    background: #f9fafb;
    border-radius: 10px;
    margin-bottom: 26px;
  }

  .search-results {
    max-height: 210px;
    overflow-y: auto;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 7px;
    margin-top: -10px;
    margin-bottom: 18px;
  }

  .search-results button {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    padding: 12px 14px;
    background: white;
    border: none;
    border-bottom: 1px solid #f3f4f6;
    text-align: left;
    cursor: pointer;
  }

  .search-results button:hover,
  .search-results button.selected {
    background: #eff6ff;
  }

  .search-results small {
    color: #6b7280;
  }

  .no-results {
    padding: 12px;
    color: #6b7280;
  }

  .selected-person {
    margin-bottom: 18px;
    color: #374151;
  }

  .role-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .secondary-btn {
    padding: 10px 16px;
    background: white;
    color: #2563eb;
    border: 1px solid #2563eb;
    border-radius: 7px;
    cursor: pointer;
  }

  .selected-credits h3 {
    font-size: 1.1rem;
    margin-bottom: 16px;
  }

  .empty {
    padding: 20px;
    background: #f9fafb;
    border-radius: 8px;
    color: #6b7280;
  }

  .credits-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .credit-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
  }

  .credit-info {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .credit-info span {
    color: #6b7280;
    font-size: 0.9rem;
  }

  .remove-btn {
    padding: 8px 12px;
    color: #dc2626;
    background: white;
    border: 1px solid #fecaca;
    border-radius: 6px;
    cursor: pointer;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 16px;
  }

  .cancel-link {
    padding: 12px 20px;
    color: #374151;
    text-decoration: none;
  }

  .save-btn {
    padding: 12px 24px;
    background: #2563eb;
    color: white;
    border: none;
    border-radius: 7px;
    font-weight: 600;
    cursor: pointer;
  }

  .save-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .alert {
    padding: 14px 16px;
    border-radius: 8px;
    margin-bottom: 20px;
  }

  .alert.error {
    background: #fef2f2;
    color: #b91c1c;
  }

  .alert.success {
    background: #f0fdf4;
    color: #15803d;
  }

  @media (max-width: 650px) {
    .panel {
      padding: 18px;
    }

    .artwork-layout {
      flex-direction: column;
    }

    .artwork-preview {
      width: 150px;
    }

    .section-header {
      flex-direction: column;
    }

    .role-fields {
      grid-template-columns: 1fr;
      gap: 0;
    }

    .page-header {
      flex-direction: column;
    }
  }
</style>

