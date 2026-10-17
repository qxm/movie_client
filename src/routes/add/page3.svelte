<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';

    import {
        createMovie
    } from '#lib/api/movies';

    import {
        getPeople,
        type Person
    } from '#lib/api/people';

    import AddPersonModal from '#lib/components/AddPersonModal.svelte';

    type CreditRole =
        | 'ACTOR'
        | 'DIRECTOR'
        | 'WRITER'
        | 'PRODUCER';

    interface Credit {
        personId: string;
        personName: string;
        role: CreditRole;
        characterName: string;
    }

    // Movie fields
    let title = $state('');
    let releaseYear = $state<number | undefined>(undefined);
    let synopsis = $state('');
    let artworkUrl = $state('');

    // People and credits
    let people: Person[] = $state([]);
    let credits: Credit[] = $state([]);

    let selectedPersonId = $state('');
    let selectedRole = $state<CreditRole>('ACTOR');
    let characterName = $state('');

    // UI states
    let showAddPersonModal = $state(false);
    let loadingPeople = $state(true);
    let saving = $state(false);
    let error = $state('');
    let peopleError = $state('');
    let creditError = $state('');

    const roles: CreditRole[] = [
        'ACTOR',
        'DIRECTOR',
        'WRITER',
        'PRODUCER'
    ];

    onMount(async () => {
        try {
            people = await getPeople();
        } catch (e) {
            peopleError = e instanceof Error
                ? e.message
                : 'Failed to load people';
        } finally {
            loadingPeople = false;
        }
    });

    function handlePersonCreated(person: Person) {
        people = [...people, person];

        // Automatically select the newly created person
        selectedPersonId = person.id;
        peopleError = '';
    }

    function addCredit() {
        creditError = '';

        const person = people.find(
            p => p.id === selectedPersonId
        );

        if (!person) {
            creditError = 'Please select a person.';
            return;
        }

        const duplicate = credits.some(
            credit =>
                credit.personId === person.id &&
                credit.role === selectedRole &&
                credit.characterName.trim() === characterName.trim()
        );

        if (duplicate) {
            creditError = 'This credit already exists.';
            return;
        }

        credits = [
            ...credits,
            {
                personId: person.id,
                personName: person.name,
                role: selectedRole,
                characterName: selectedRole === 'ACTOR'
                    ? characterName.trim()
                    : ''
            }
        ];

        selectedPersonId = '';
        selectedRole = 'ACTOR';
        characterName = '';
    }

    function removeCredit(index: number) {
        credits = credits.filter((_, i) => i !== index);
    }

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();

        if (saving) return;

        error = '';

        if (!title.trim()) {
            error = 'Movie title is required.';
            return;
        }

        if (
            releaseYear !== undefined &&
            (!Number.isInteger(releaseYear) ||
             releaseYear < 1888 ||
             releaseYear > 2100)
        ) {
            error = 'Please enter a valid release year.';
            return;
        }

        saving = true;

        try {
            const movie = await createMovie({
                title: title.trim(),
                releaseYear: releaseYear ?? 0,
                synopsis: synopsis.trim(),
                artworkUrl: artworkUrl.trim(),
                credits: credits.map(credit => ({
                     personId: credit.personId,
                     role: credit.role,
                     characterName: credit.characterName
                }))
            });

            // Credits are not persisted yet.
            // We will add this after implementing Movie Credits gRPC.

            await goto(`/movies/${movie.id}`);

        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'Failed to create movie';
        } finally {
            saving = false;
        }
    }
</script>

<svelte:head>
    <title>Add Movie</title>
</svelte:head>

<div class="page">
    <h1>Add Movie</h1>

    <form onsubmit={handleSubmit}>
        <section>
            <h2>Movie Information</h2>

            <div class="field">
                <label for="title">Title *</label>
                <input
                    id="title"
                    type="text"
                    bind:value={title}
                    maxlength="255"
                    required
                />
            </div>

            <div class="field">
                <label for="release-year">Release Year</label>
                <input
                    id="release-year"
                    type="number"
                    min="1888"
                    max="2100"
                    bind:value={releaseYear}
                />
            </div>

            <div class="field">
                <label for="synopsis">Synopsis</label>
                <textarea
                    id="synopsis"
                    bind:value={synopsis}
                    rows="5"
                ></textarea>
            </div>

            <div class="field">
                <label for="artwork">Artwork URL</label>
                <input
                    id="artwork"
                    type="url"
                    bind:value={artworkUrl}
                    placeholder="https://example.com/poster.jpg"
                />
            </div>

            {#if artworkUrl}
                <div class="artwork-preview">
                    <img
                        src={artworkUrl}
                        alt="Artwork preview"
                    />
                </div>
            {/if}
        </section>

        <section>
            <div class="section-header">
                <h2>Cast & Crew</h2>

                <button
                    type="button"
                    onclick={() => showAddPersonModal = true}
                >
                    + Add New Person
                </button>
            </div>

            {#if loadingPeople}
                <p>Loading people...</p>
            {:else if peopleError}
                <p class="error" role="alert">{peopleError}</p>
                <button
                    type="button"
                    onclick={async () => {
                        loadingPeople = true;
                        peopleError = '';
                        try {
                            people = await getPeople();
                        } catch (e) {
                            peopleError = e instanceof Error
                                ? e.message
                                : 'Failed to load people';
                        } finally {
                            loadingPeople = false;
                        }
                    }}
                >
                    Retry
                </button>
            {/if}

            <div class="credit-editor">
                <div class="field">
                    <label for="person">Person</label>
                    <select
                        id="person"
                        bind:value={selectedPersonId}
                    >
                        <option value="">Select Person</option>

                        {#each people as person (person.id)}
                            <option value={person.id}>
                                {person.name}
                            </option>
                        {/each}
                    </select>
                </div>

                <div class="field">
                    <label for="role">Role</label>
                    <select id="role" bind:value={selectedRole}>
                        {#each roles as role}
                            <option value={role}>{role}</option>
                        {/each}
                    </select>
                </div>

                {#if selectedRole === 'ACTOR'}
                    <div class="field">
                        <label for="character">
                            Character Name
                        </label>
                        <input
                            id="character"
                            bind:value={characterName}
                        />
                    </div>
                {/if}

                <button
                    type="button"
                    onclick={addCredit}
                    disabled={!selectedPersonId}
                >
                    Add Credit
                </button>
            </div>

            {#if creditError}
                <p class="error" role="alert">{creditError}</p>
            {/if}

            {#if credits.length > 0}
                <table>
                    <thead>
                        <tr>
                            <th>Person</th>
                            <th>Role</th>
                            <th>Character</th>
                            <th>Action</th>
                        </tr>
                    </thead>

                    <tbody>
                        {#each credits as credit, index}
                            <tr>
                                <td>{credit.personName}</td>
                                <td>{credit.role}</td>
                                <td>{credit.characterName || '-'}</td>
                                <td>
                                    <button
                                        type="button"
                                        onclick={() => removeCredit(index)}
                                    >
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        {/each}
                    </tbody>
                </table>
            {:else}
                <p class="muted">No cast or crew added.</p>
            {/if}

            <p class="notice">
                Credits can be edited here, but they are not yet
                saved to the backend. Only movie information
                will be persisted.
            </p>
        </section>

        {#if error}
            <p class="error" role="alert">{error}</p>
        {/if}

        <div class="form-actions">
            <button
                type="button"
                onclick={() => goto('/')}
                disabled={saving}
            >
                Cancel
            </button>

            <button
                type="submit"
                disabled={saving || !title.trim()}
            >
                {saving ? 'Saving...' : 'Create Movie'}
            </button>
        </div>
    </form>
</div>

{#if showAddPersonModal}
    <AddPersonModal
        onClose={() => showAddPersonModal = false}
        onCreated={handlePersonCreated}
    />
{/if}

<style>
    .page {
        max-width: 1000px;
        margin: 0 auto;
        padding: 24px;
    }

    section {
        padding: 24px;
        margin-bottom: 24px;
        border: 1px solid #ddd;
        border-radius: 10px;
    }

    h1 {
        margin-bottom: 24px;
    }

    h2 {
        margin: 0 0 20px;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 18px;
    }

    input,
    textarea,
    select {
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 6px;
        font: inherit;
        width: 100%;
        box-sizing: border-box;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
    }

    .section-header h2 {
        margin: 0;
    }

    .credit-editor {
        display: grid;
        grid-template-columns: 2fr 1fr 2fr auto;
        align-items: end;
        gap: 12px;
        margin-bottom: 20px;
    }

    .credit-editor .field {
        margin-bottom: 0;
    }

    button {
        padding: 10px 16px;
        cursor: pointer;
        border-radius: 6px;
    }

    button:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }

    table {
        width: 100%;
        border-collapse: collapse;
    }

    th, td {
        text-align: left;
        padding: 12px;
        border-bottom: 1px solid #ddd;
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
    }

    .artwork-preview img {
        width: 150px;
        max-height: 220px;
        object-fit: cover;
        border-radius: 8px;
    }

    .error {
        color: #c62828;
    }

    .notice {
        margin-top: 16px;
        color: #8a5800;
        font-size: 0.9rem;
    }

    .muted {
        color: #777;
    }

    @media (max-width: 700px) {
        .credit-editor {
            grid-template-columns: 1fr;
        }

        .section-header {
            flex-wrap: wrap;
        }

        section {
            padding: 16px;
        }

        .page {
            padding: 12px;
        }

        table {
            display: block;
            overflow-x: auto;
        }
    }
</style>
