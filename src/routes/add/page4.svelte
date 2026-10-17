<script lang="ts">
    import { goto } from '$app/navigation';
    import { createMovie } from '#lib/api/movies';
    import CastCrewEditor from '#lib/components/CastCrewEditor.svelte';

    type CreditRole = 'ACTOR' | 'DIRECTOR' | 'WRITER' | 'PRODUCER';

    interface EditableCredit {
        personId: string;
        name: string;
        role: CreditRole;
        characterName?: string | null;
    }

    let title = $state('');
    let releaseYear = $state<number | undefined>(undefined);
    let synopsis = $state('');
    let artworkUrl = $state('');
    let credits = $state<EditableCredit[]>([]);

    let saving = $state(false);
    let error = $state('');

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
                credits: credits.map((credit) => ({
                    personId: credit.personId,
                    role: credit.role,
                    characterName: credit.role === 'ACTOR'
                        ? (credit.characterName?.trim() ?? '')
                        : ''
                }))
            });

            await goto(`/movies/${movie.id}`);
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to create movie';
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
                <textarea id="synopsis" bind:value={synopsis} rows="5"></textarea>
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
                    <img src={artworkUrl} alt="Artwork preview" />
                </div>
            {/if}
        </section>

        <section>
            <CastCrewEditor bind:credits mockMode={false} />
        </section>

        {#if error}
            <p class="error" role="alert">{error}</p>
        {/if}

        <div class="form-actions">
            <button type="button" onclick={() => goto('/')} disabled={saving}>
                Cancel
            </button>
            <button type="submit" disabled={saving || !title.trim()}>
                {saving ? 'Saving...' : 'Create Movie'}
            </button>
        </div>
    </form>
</div>

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

    h1 { margin-bottom: 24px; }
    h2 { margin: 0 0 20px; }

    .field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 18px;
    }

    input, textarea {
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 6px;
        font: inherit;
        width: 100%;
        box-sizing: border-box;
    }

    button {
        padding: 10px 16px;
        cursor: pointer;
        border-radius: 6px;
    }

    button:disabled { cursor: not-allowed; opacity: 0.6; }

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

    .error { color: #c62828; }

    @media (max-width: 700px) {
        section { padding: 16px; }
        .page { padding: 12px; }
    }
</style>
