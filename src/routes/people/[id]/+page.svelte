
<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { graphql } from '#lib/api/graphql';
  import DetailActions from '#lib/components/DetailActions.svelte';

  interface Person {
    id: string;
    name: string;
    biography: string | null;
  }

  const id = $derived(page.params.id);

  let person = $state<Person | null>(null);

  let form = $state({
    name: '',
    biography: ''
  });

  let loading = $state(true);
  let editing = $state(false);
  let saving = $state(false);
  let deleting = $state(false);
  let error = $state('');
  let success = $state('');

  const PERSON_QUERY = `
    query Person($id: ID!) {
      person(id: $id) {
        id
        name
        biography
      }
    }
  `;

  const UPDATE_PERSON = `
    mutation UpdatePerson($id: ID!, $input: UpdatePersonInput!) {
      updatePerson(id: $id, input: $input) {
        id
        name
        biography
      }
    }
  `;

  const DELETE_PERSON = `
    mutation DeletePerson($id: ID!) {
      deletePerson(id: $id)
    }
  `;

  async function loadPerson(personId: string) {
    loading = true;
    error = '';
    person = null;
    editing = false;
    success = '';

    try {
      const data = await graphql<{ person: Person | null }>(
        PERSON_QUERY,
        { id: personId }
      );

      if (!data.person) {
        error = 'Person not found.';
        return;
      }

      person = data.person;
      resetForm();
    } catch (e) {
      error = e instanceof Error
        ? e.message
        : 'Failed to load person.';
    } finally {
      loading = false;
    }
  }

  function resetForm() {
    if (!person) return;

    form = {
      name: person.name,
      biography: person.biography ?? ''
    };
  }

  function cancelEdit() {
    resetForm();
    editing = false;
    error = '';
  }

  async function savePerson() {
    if (!person) return;

    if (!form.name.trim()) {
      error = 'Name is required.';
      return;
    }

    saving = true;
    error = '';
    success = '';

    try {
      const data = await graphql<{
        updatePerson: Person;
      }>(UPDATE_PERSON, {
        id: person.id,
        input: {
          name: form.name.trim(),
          biography: form.biography.trim()
        }
      });

      person = {
        ...person,
        ...data.updatePerson
      };

      editing = false;
      success = 'Person updated successfully.';
    } catch (e) {
      error = e instanceof Error
        ? e.message
        : 'Update failed.';
    } finally {
      saving = false;
    }
  }

  async function deletePerson() {
    if (!person) return;

    deleting = true;
    error = '';

    try {
      const data = await graphql<{
        deletePerson: boolean;
      }>(DELETE_PERSON, { id: person.id });

      if (!data.deletePerson) {
        throw new Error('Person could not be deleted.');
      }

      await goto('/search');
    } catch (e) {
      error = e instanceof Error
        ? e.message
        : 'Delete failed.';
    } finally {
      deleting = false;
    }
  }


  $effect(() => {
    const personId = id;
    if (personId) void loadPerson(personId);
  });
</script>

<svelte:head>
  <title>{person?.name ?? 'Person Details'} | Movie Manager</title>
</svelte:head>

<div class="detail-page">
  <a class="back" href="/search">← Back to Search</a>

  {#if loading}
    <p role="status">Loading person...</p>
  {:else if person}
    <div class="profile-header">
      <div class="photo">
        <div class="placeholder">👤</div>
      </div>

      <div class="profile-info">
        <h1>{person.name}</h1>


        {#if !editing}
          <DetailActions
            onEdit={() => {
              success = '';
              editing = true;
            }}
            onDelete={deletePerson}
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
        <h2>Edit Person</h2>

        <form onsubmit={(e) => {
          e.preventDefault();
          savePerson();
        }}>
          <label for="name">Name *</label>
          <input
            id="name"
            bind:value={form.name}
            required
          />

          <label for="biography">Biography</label>
          <textarea
            id="biography"
            rows="6"
            bind:value={form.biography}
          ></textarea>

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
        <h2>Biography</h2>
        <p class="biography">
          {person.biography || 'No biography available.'}
        </p>
      </section>
    {/if}

  {:else}
    <p class="error" role="alert">
      {error || 'Person not found.'}
    </p>
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

  .profile-header {
    display: flex;
    gap: 28px;
    align-items: flex-start;
    margin-bottom: 28px;
  }

  .photo {
    width: 180px;
    flex-shrink: 0;
  }

  .photo img,
  .placeholder {
    width: 100%;
    aspect-ratio: 3 / 4;
    object-fit: cover;
    border-radius: 12px;
  }

  .placeholder {
    display: grid;
    place-items: center;
    background: #e5e7eb;
    font-size: 3rem;
  }

  .profile-info {
    flex: 1;
  }

  h1 {
    margin: 0 0 12px;
    font-size: 2rem;
  }

  .profile-info :global(.actions) {
    margin-top: 24px;
  }

  .muted {
    color: #6b7280;
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

  .biography {
    line-height: 1.7;
    white-space: pre-wrap;
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
    width: 100%;
    box-sizing: border-box;
    padding: 11px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font: inherit;
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

  .form-actions .secondary {
    background: #e5e7eb;
    color: #111827;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .film {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 0;
    border-bottom: 1px solid #e5e7eb;
  }

  .film a {
    color: #2563eb;
    font-weight: 600;
    text-decoration: none;
  }

  .film p {
    margin: 6px 0 0;
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
    .profile-header {
      flex-direction: column;
    }

    .photo {
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


