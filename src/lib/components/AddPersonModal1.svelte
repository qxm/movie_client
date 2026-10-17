
<script lang="ts">
  import { graphql } from '#lib/api/graphql';
  import { personStore } from '#lib/mock/personStore.svelte';

  type Role = 'ACTOR' | 'DIRECTOR' | 'WRITER' | 'PRODUCER';

  export interface AddedPerson {
    id: string;
    name: string;
    role: Role;
    characterName?: string;
  }

  let {
    onCancel,
    onAdded,
    mode = 'mock'
  }: {
    onCancel: () => void;
    onAdded: (person: AddedPerson) => void;
    mode?: 'mock' | 'graphql';
  } = $props();

  let name = $state('');
  let knownAs = $state('');
  let biography = $state('');
  let photoUrl = $state('');

  let role = $state<Role>('ACTOR');
  let characterName = $state('');

  let saving = $state(false);
  let error = $state('');

  const CREATE_PERSON = `
    mutation CreatePerson($input: PersonInput!) {
      createPerson(input: $input) {
        id
        name
      }
    }
  `;

  async function addPerson() {
    if (!name.trim()) {
      error = 'Person name is required.';
      return;
    }

    saving = true;
    error = '';

    try {
      const input = {
        name: name.trim(),
        knownAs: knownAs.trim() || null,
        biography: biography.trim() || null,
        photoUrl: photoUrl.trim() || null
      };

      let createdPerson: {
        id: string;
        name: string;
      };

      if (mode === 'mock') {
        // Simulate a short network delay.
        await new Promise((resolve) => setTimeout(resolve, 300));

        createdPerson = personStore.create(input);
      } else {
        const result = await graphql<{
          createPerson: {
            id: string;
            name: string;
          };
        }>(CREATE_PERSON, { input });

        createdPerson = result.createPerson;
      }

      onAdded({
        id: createdPerson.id,
        name: createdPerson.name,
        role,
        characterName:
          role === 'ACTOR'
            ? characterName.trim() || undefined
            : undefined
      });
    } catch (e) {
      error = e instanceof Error
        ? e.message
        : 'Failed to create person.';
    } finally {
      saving = false;
    }
  }
</script>

<div class="overlay">
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="add-person-title"
  >
    <div class="modal-header">
      <div>
        <h2 id="add-person-title">Add New Person</h2>
        <p class="subtitle">
          Create a new person for this movie.
        </p>
      </div>

      <button
        type="button"
        class="close"
        aria-label="Close dialog"
        disabled={saving}
        onclick={onCancel}
      >
        ×
      </button>
    </div>

    {#if mode === 'mock'}
      <div class="mock-banner">
        Mock Mode — no backend required
      </div>
    {/if}

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}

    <form
      onsubmit={(event) => {
        event.preventDefault();
        addPerson();
      }}
    >
      <div class="field">
        <label for="person-name">Full Name *</label>
        <input
          id="person-name"
          bind:value={name}
          placeholder="e.g. Tim Robbins"
          required
        />
      </div>

      <div class="field">
        <label for="known-as">Also Known As</label>
        <input
          id="known-as"
          bind:value={knownAs}
          placeholder="Alternative name"
        />
      </div>

      <div class="field">
        <label for="photo-url">Photo URL</label>
        <input
          id="photo-url"
          type="url"
          bind:value={photoUrl}
          placeholder="https://example.com/photo.jpg"
        />
      </div>

      <div class="field">
        <label for="biography">Biography</label>
        <textarea
          id="biography"
          bind:value={biography}
          rows="3"
          placeholder="Short biography (optional)"
        ></textarea>
      </div>

      <div class="separator"></div>

      <h3>Role in This Movie</h3>

      <div class="field">
        <label for="role">Role *</label>
        <select id="role" bind:value={role}>
          <option value="ACTOR">Actor</option>
          <option value="DIRECTOR">Director</option>
          <option value="WRITER">Writer</option>
          <option value="PRODUCER">Producer</option>
        </select>
      </div>

      {#if role === 'ACTOR'}
        <div class="field">
          <label for="character-name">Character Name</label>
          <input
            id="character-name"
            bind:value={characterName}
            placeholder="e.g. Andy Dufresne"
          />
        </div>
      {/if}

      <div class="actions">
        <button
          type="button"
          class="cancel"
          disabled={saving}
          onclick={onCancel}
        >
          Cancel
        </button>

        <button
          type="submit"
          class="primary"
          disabled={saving || !name.trim()}
        >
          {saving ? 'Adding...' : 'Add Person'}
        </button>
      </div>
    </form>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgb(0 0 0 / 55%);
  }

  .modal {
    width: min(520px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    box-sizing: border-box;
    background: white;
    border-radius: 12px;
    padding: 28px;
    box-shadow: 0 20px 60px rgb(0 0 0 / 20%);
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  h3 {
    margin: 0 0 14px;
    font-size: 1rem;
  }

  .subtitle {
    margin: 8px 0 20px;
    color: #6b7280;
    font-size: 0.9rem;
  }

  .close {
    background: transparent;
    border: none;
    font-size: 1.8rem;
    cursor: pointer;
  }

  .mock-banner {
    padding: 10px 12px;
    margin-bottom: 20px;
    border-radius: 6px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 0.85rem;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }

  label {
    font-size: 0.9rem;
    font-weight: 600;
  }

  input,
  textarea,
  select {
    width: 100%;
    box-sizing: border-box;
    padding: 11px 12px;
    border: 1px solid #d1d5db;
    border-radius: 7px;
    font: inherit;
    background: white;
  }

  input:focus,
  textarea:focus,
  select:focus {
    outline: 2px solid #93c5fd;
    border-color: #2563eb;
  }

  .separator {
    border-top: 1px solid #e5e7eb;
    margin: 6px 0;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    margin-top: 12px;
  }

  .actions button {
    padding: 11px 20px;
    border-radius: 7px;
    font-weight: 600;
    cursor: pointer;
  }

  .cancel {
    background: white;
    border: 1px solid #d1d5db;
  }

  .primary {
    background: #2563eb;
    color: white;
    border: 1px solid #2563eb;
  }

  button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .error {
    color: #b91c1c;
    background: #fef2f2;
    padding: 10px;
    border-radius: 6px;
  }

  @media (max-width: 600px) {
    .modal {
      padding: 20px;
    }
  }
</style>

