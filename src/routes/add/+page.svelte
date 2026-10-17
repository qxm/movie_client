<script lang="ts">
    import { goto } from '$app/navigation';
    import { onDestroy } from 'svelte';
    import { uploadArtwork, validateArtwork } from '#lib/api/artworks';
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
    let artworkFile = $state<File | null>(null);
    let artworkPreview = $state('');
    let uploading = $state(false);
    let uploadProgress = $state(0);
    let uploadedArtwork: { file: File; url: string } | null = null;
    let createdMovieId = $state('');
    let previewObjectUrl: string | null = null;

    function onArtworkSelected(event: Event) {
        const input = event.currentTarget as HTMLInputElement;
        const file = input.files?.[0] ?? null;
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
        artworkFile = null;
        artworkPreview = '';
        error = '';
        if (!file) return;
        const validationError = validateArtwork(file);
        if (validationError) {
            error = validationError;
            input.value = '';
            return;
        }
        artworkFile = file;
        previewObjectUrl = URL.createObjectURL(file);
        artworkPreview = previewObjectUrl;
    }

    onDestroy(() => {
        if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
    });

    let credits = $state<EditableCredit[]>([]);

    let saving = $state(false);
    let error = $state('');

    async function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        if (saving) return;
        error = '';

        if (!title.trim() || title.trim().length > 255) {
            error = 'Movie title is required and must be 255 characters or fewer.';
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
            if (createdMovieId) {
                await goto(`/movies/${createdMovieId}`);
                return;
            }
            let uploadedUrl = artworkUrl.trim();
            if (artworkFile) {
                if (uploadedArtwork?.file !== artworkFile) {
                    uploading = true;
                    uploadProgress = 0;
                    uploadedArtwork = {
                        file: artworkFile,
                        url: await uploadArtwork(artworkFile, (progress) => uploadProgress = progress)
                    };
                }
                uploadedUrl = uploadedArtwork.url;
            }
            uploading = false;
            const movie = await createMovie({
                title: title.trim(),
                releaseYear: releaseYear ?? 0,
                synopsis: synopsis.trim(),
                artworkUrl: uploadedUrl,
                credits: credits.map((credit) => ({
                    personId: credit.personId,
                    role: credit.role,
                    characterName: credit.role === 'ACTOR'
                        ? (credit.characterName?.trim() ?? '')
                        : ''
                }))
            });

            createdMovieId = movie.id;
            await goto(`/movies/${movie.id}`);
        } catch (e) {
            error = e instanceof Error ? e.message : 'Failed to create movie';
        } finally {
            uploading = false;
            saving = false;
        }
    }
</script>

<svelte:head>
    <title>Add Movie</title>
</svelte:head>

<div class="page">
    <h1>Add Movie</h1>

    <form id="add-movie" onsubmit={handleSubmit} aria-busy={saving}>
        <fieldset disabled={saving}>
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
                <label for="artwork-file">Upload Poster (JPEG/PNG, max 5 MB)</label>
                <input id="artwork-file" type="file" accept="image/jpeg,image/png" onchange={onArtworkSelected} disabled={saving} />
            </div>

            <div class="field">
                <label for="artwork">Or Artwork URL</label>
                <input
                    id="artwork"
                    type="url"
                    bind:value={artworkUrl}
                    placeholder="https://example.com/poster.jpg"
                />
            </div>

            {#if artworkPreview || artworkUrl}
                <div class="artwork-preview">
                    <img src={artworkPreview || artworkUrl} alt="Artwork preview" />
                </div>
            {/if}
        </section>

        </fieldset>
    </form>

    <fieldset disabled={saving}>
        <section>
            <CastCrewEditor bind:credits mockMode={false} />
        </section>
    </fieldset>

    {#if uploading}
        <p role="status">{uploadProgress < 100 ? `Uploading poster: ${uploadProgress}%` : 'Processing poster...'}</p>
        <progress max="100" value={uploadProgress}> {uploadProgress}% </progress>
    {:else if saving}
        <p role="status">Saving movie...</p>
    {/if}

        {#if error}
            <p class="error" role="alert">{error}</p>
        {/if}

        <div class="form-actions">
            <button type="button" onclick={() => goto('/')} disabled={saving}>
                Cancel
            </button>
            <button type="submit" form="add-movie" disabled={saving || !title.trim()}>
                {createdMovieId ? 'Open Created Movie' : uploading ? 'Uploading poster...' : saving ? 'Saving...' : 'Create Movie'}
            </button>
        </div>
</div>

<style>
    fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
    progress { width: 100%; }

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
        fieldset { border: 0; padding: 0; margin: 0; min-width: 0; }
    progress { width: 100%; }

    .page { padding: 12px; }
    }
</style>
