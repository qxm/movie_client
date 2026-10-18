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

	let artworkSource = $state<'upload' | 'url'>('upload');
	let artworkError = $state('');
	let previewFailed = $state(false);
	let fileInput = $state<HTMLInputElement>();
	const poster = $derived(artworkSource === 'upload' ? artworkPreview : artworkUrl.trim());

	$effect(() => {
		void poster;
		previewFailed = false;
	});

	function onArtworkSelected(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const validationError = validateArtwork(file);
		if (validationError) {
			artworkError = validationError;
			input.value = '';
			return;
		}
		if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
		artworkFile = file;
		previewObjectUrl = URL.createObjectURL(file);
		artworkPreview = previewObjectUrl;
		uploadedArtwork = null;
		artworkError = '';
	}

	function removeArtwork() {
		if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
		previewObjectUrl = null;
		artworkPreview = '';
		artworkFile = null;
		uploadedArtwork = null;
		artworkError = '';
		if (fileInput) fileInput.value = '';
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
			(!Number.isInteger(releaseYear) || releaseYear < 1888 || releaseYear > 2100)
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
			let uploadedUrl = artworkSource === 'url' ? artworkUrl.trim() : '';
			if (artworkSource === 'upload' && artworkFile) {
				if (uploadedArtwork?.file !== artworkFile) {
					uploading = true;
					uploadProgress = 0;
					uploadedArtwork = {
						file: artworkFile,
						url: await uploadArtwork(artworkFile, (progress) => (uploadProgress = progress))
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
					characterName: credit.role === 'ACTOR' ? (credit.characterName?.trim() ?? '') : ''
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
	<title>Add Movie | Movie Manager</title>
	<meta
		name="description"
		content="Add a movie, choose its poster, and bring the cast and crew together."
	/>
</svelte:head>

<div class="add-page">
	<a class="back-link" href="/">← Back to movies</a>
	<header class="page-heading">
		<div>
			<p class="eyebrow">YOUR MOVIE COLLECTION</p>
			<h1>Add a movie<span>.</span></h1>
			<p class="intro">Start with a title. Add the story, the artwork, and the people behind it.</p>
		</div>
		<span class="required-note"><span aria-hidden="true">*</span> Required field</span>
	</header>

	<div class="editor-grid">
		<div class="main-column">
			<form id="add-movie" onsubmit={handleSubmit} aria-busy={saving}>
				<fieldset class="panel information" disabled={saving || !!createdMovieId}>
					<legend class="sr-only">Movie information</legend>
					<div class="section-title">
						<span class="section-number" aria-hidden="true">01</span>
						<div>
							<h2>The essentials</h2>
							<p>Give your movie a name and a little context.</p>
						</div>
					</div>
					<div class="details-row">
						<div class="field title-field">
							<label for="title">Movie title <span class="required">*</span></label>
							<input
								id="title"
								name="title"
								type="text"
								bind:value={title}
								maxlength="255"
								required
								placeholder="e.g. The Grand Budapest Hotel"
								autocomplete="off"
								aria-describedby="title-hint"
							/>
							<div class="field-meta" id="title-hint">
								<span>The title as it appears on screen.</span><span>{title.length}/255</span>
							</div>
						</div>
						<div class="field year-field">
							<label for="release-year">Release year</label>
							<input
								id="release-year"
								name="releaseYear"
								type="number"
								min="1888"
								max="2100"
								step="1"
								bind:value={releaseYear}
								placeholder="e.g. 2014"
								aria-describedby="year-hint"
							/>
							<p class="hint" id="year-hint">Optional · 1888–2100</p>
						</div>
					</div>
					<div class="field synopsis-field">
						<label for="synopsis">Synopsis <span class="optional">Optional</span></label>
						<textarea
							id="synopsis"
							name="synopsis"
							bind:value={synopsis}
							rows="6"
							placeholder="What’s the story? Write a short introduction to the movie."
							aria-describedby="synopsis-hint"></textarea>
						<p class="hint" id="synopsis-hint">
							A few sentences are enough. You can always edit this later.
						</p>
					</div>
				</fieldset>
			</form>

			<fieldset class="panel credits-panel" disabled={saving || !!createdMovieId}>
				<legend class="sr-only">Cast and crew</legend>
				<div class="cast-label">
					<span class="section-number" aria-hidden="true">02</span><span
						>THE PEOPLE BEHIND THE STORY</span
					>
				</div>
				<CastCrewEditor bind:credits mockMode={false} />
			</fieldset>
		</div>

		<aside class="poster-column" aria-label="Movie poster">
			<fieldset class="panel poster-panel" disabled={saving || !!createdMovieId}>
				<legend class="sr-only">Poster artwork</legend>
				<div class="poster-heading">
					<h2>Movie poster</h2>
					<span class="optional">Optional</span>
				</div>
				<p class="poster-intro">The first impression of your movie.</p>
				<div class="poster-preview" class:has-poster={poster && !previewFailed}>
					{#if poster && !previewFailed}
						<img
							src={poster}
							alt={title.trim() ? `Poster preview for ${title.trim()}` : 'Movie poster preview'}
							onerror={() => (previewFailed = true)}
						/>
					{:else}
						<div class="poster-placeholder">
							<svg
								width="44"
								height="44"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								stroke-width="1.2"
								aria-hidden="true"
								><rect x="3" y="3" width="18" height="18" rx="3" /><circle
									cx="8.5"
									cy="8.5"
									r="1.5"
								/><path d="m3 16 5-5 5 5 3-3 5 5" /></svg
							>
							<strong>{previewFailed ? 'Preview unavailable' : 'A story worth seeing'}</strong>
							<span
								>{previewFailed
									? 'Check the image link or choose another poster.'
									: 'Add a poster to bring it to life.'}</span
							>
						</div>
					{/if}
				</div>
				<div class="movie-caption">
					<strong>{title.trim() || 'Your movie title'}</strong><span
						>{releaseYear ?? 'Release year'}</span
					>
				</div>
				<div class="source-switch" role="group" aria-label="Poster source">
					<button
						type="button"
						aria-pressed={artworkSource === 'upload'}
						onclick={() => (artworkSource = 'upload')}>Upload image</button
					>
					<button
						type="button"
						aria-pressed={artworkSource === 'url'}
						onclick={() => (artworkSource = 'url')}>Image link</button
					>
				</div>
				{#if artworkSource === 'upload'}
					<div class="upload-zone">
						<input
							class="sr-only file-input"
							bind:this={fileInput}
							id="artwork-file"
							type="file"
							accept="image/jpeg,image/png"
							onchange={onArtworkSelected}
							aria-describedby="upload-hint"
						/>
						<label class="upload-button" for="artwork-file"
							><span aria-hidden="true">↑</span>
							{artworkFile ? 'Replace image' : 'Choose an image'}</label
						>
						<p id="upload-hint" class="hint">JPEG or PNG · Up to 5 MB</p>
					</div>
					{#if artworkFile}
						<div class="file-details">
							<span title={artworkFile.name}
								>{artworkFile.name}
								<small>{(artworkFile.size / 1024 / 1024).toFixed(2)} MB</small></span
							><button
								class="text-button"
								type="button"
								onclick={removeArtwork}
								aria-label="Remove selected poster">Remove</button
							>
						</div>
					{/if}
				{:else}
					<div class="field url-field">
						<label for="artwork">Image URL</label>
						<input
							id="artwork"
							form="add-movie"
							type="url"
							bind:value={artworkUrl}
							placeholder="https://example.com/poster.jpg"
							aria-describedby="url-hint"
						/>
						<p class="hint" id="url-hint">Use a direct link to an image.</p>
					</div>
				{/if}
				{#if artworkError && artworkSource === 'upload'}<p class="artwork-error" role="alert">
						{artworkError}
					</p>{/if}
			</fieldset>
			<p class="aside-note">Make it yours. You can update every detail after creating the movie.</p>
		</aside>
	</div>

	{#if error}
		<div class="error-banner" role="alert">
			<strong
				>{createdMovieId
					? 'Movie created, but the details page could not open.'
					: 'We couldn’t create your movie.'}</strong
			>
			<p>{error}</p>
		</div>
	{/if}
	<footer class="save-bar" aria-busy={saving}>
		<div class="save-summary" role="status">
			{#if uploading}
				<strong
					>{uploadProgress < 100
						? `Uploading poster · ${uploadProgress}%`
						: 'Processing poster…'}</strong
				>
				<progress max="100" value={uploadProgress} aria-label="Poster upload progress"
					>{uploadProgress}%</progress
				>
			{:else if saving}
				<strong>Saving your movie…</strong><span>This will only take a moment.</span>
			{:else}
				<strong
					>{title.trim() ? 'Ready when you are' : 'Every collection starts with a story'}</strong
				>
				<span
					>{credits.length} cast &amp; crew credit{credits.length === 1 ? '' : 's'} added · Only the title
					is required</span
				>
			{/if}
		</div>
		<div class="form-actions">
			<button class="cancel-button" type="button" onclick={() => goto('/')} disabled={saving}
				>Cancel</button
			>
			<button
				class="create-button"
				type="submit"
				form="add-movie"
				disabled={saving || !title.trim()}
			>
				{#if saving}<span class="spinner" aria-hidden="true"></span>{/if}
				{createdMovieId
					? 'Open created movie'
					: uploading
						? 'Uploading…'
						: saving
							? 'Creating…'
							: 'Create movie'}
				{#if !saving}<span aria-hidden="true">↗</span>{/if}
			</button>
		</div>
	</footer>
</div>

<style>
	.add-page {
		--ink: #182638;
		--muted: #64748b;
		--line: #e2e8f0;
		--blue: #2563eb;
		color: var(--ink);
		font-family:
			Inter,
			ui-sans-serif,
			system-ui,
			-apple-system,
			sans-serif;
		padding: 4px 0 12px;
	}
	.back-link {
		display: inline-block;
		color: var(--muted);
		font-size: 13px;
		text-decoration: none;
		margin-bottom: 28px;
	}
	.back-link:hover {
		color: var(--blue);
	}
	.page-heading {
		display: flex;
		justify-content: space-between;
		align-items: end;
		gap: 24px;
		margin-bottom: 32px;
	}
	.eyebrow {
		color: var(--blue);
		font-size: 11px;
		font-weight: 750;
		letter-spacing: 1.8px;
		margin: 0 0 10px;
	}
	h1 {
		font-size: clamp(32px, 4vw, 44px);
		line-height: 1.15;
		letter-spacing: -1.8px;
		margin: 0 0 12px;
		font-weight: 750;
	}
	h1 span {
		color: var(--blue);
	}
	.intro {
		margin: 0;
		color: var(--muted);
		font-size: 14px;
		line-height: 1.7;
		max-width: 540px;
	}
	.required-note {
		white-space: nowrap;
		font-size: 12px;
		color: var(--muted);
		padding-bottom: 3px;
	}
	.required-note > span,
	.required {
		color: #c24142;
	}
	.editor-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
		gap: 24px;
		align-items: start;
	}
	.main-column,
	.poster-column {
		min-width: 0;
	}
	fieldset {
		min-width: 0;
		margin: 0;
	}
	.panel {
		border: 1px solid var(--line);
		background: #fff;
		border-radius: 14px;
		padding: 28px;
		box-shadow: 0 3px 12px #18263804;
	}
	.section-title {
		display: flex;
		gap: 13px;
		align-items: start;
		margin-bottom: 28px;
	}
	.section-number {
		display: inline-grid;
		place-items: center;
		flex-shrink: 0;
		width: 30px;
		height: 30px;
		background: #eff5ff;
		color: var(--blue);
		font-size: 11px;
		font-weight: 750;
		border-radius: 9px;
	}
	h2 {
		font-size: 18px;
		line-height: 1.4;
		letter-spacing: -0.35px;
		margin: 0;
	}
	.section-title p {
		font-size: 12px;
		line-height: 1.6;
		color: var(--muted);
		margin: 5px 0 0;
	}
	.details-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 145px;
		gap: 18px;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 9px;
		min-width: 0;
	}
	label {
		font-size: 13px;
		font-weight: 650;
	}
	input:not([type='file']),
	textarea {
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		border: 1px solid #d4dce7;
		background: #fff;
		border-radius: 8px;
		color: var(--ink);
		font: inherit;
		font-size: 13px;
		padding: 12px;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}
	input::placeholder,
	textarea::placeholder {
		color: #8793a3;
	}
	textarea {
		resize: vertical;
		min-height: 148px;
		line-height: 1.75;
	}
	input:focus-visible,
	textarea:focus-visible {
		outline: none;
		border-color: var(--blue);
		box-shadow: 0 0 0 3px #2563eb18;
	}
	button:focus-visible,
	a:focus-visible,
	.file-input:focus-visible + label {
		outline: 3px solid #93b5ff;
		outline-offset: 3px;
	}
	.hint,
	.field-meta {
		color: var(--muted);
		font-size: 11px;
		line-height: 1.6;
		margin: 0;
	}
	.field-meta {
		display: flex;
		justify-content: space-between;
		gap: 10px;
	}
	.field-meta > span:last-child {
		white-space: nowrap;
		font-variant-numeric: tabular-nums;
	}
	.synopsis-field {
		margin-top: 24px;
	}
	.optional {
		color: var(--muted);
		font-size: 11px;
		font-weight: 400;
		margin-left: 7px;
	}
	.credits-panel {
		margin-top: 22px;
	}
	.cast-label {
		display: flex;
		gap: 12px;
		align-items: center;
		font-size: 10px;
		color: var(--muted);
		font-weight: 650;
		letter-spacing: 1.2px;
		margin-bottom: 15px;
	}
	.credits-panel :global(.cast-crew-editor) {
		margin-top: 0;
	}
	.credits-panel :global(h2) {
		color: var(--ink);
		font-size: 18px;
	}
	.credits-panel :global(h3) {
		font-size: 13px;
	}
	.credits-panel :global(.section-header p) {
		font-size: 12px;
		line-height: 1.6;
	}
	.credits-panel :global(.primary-btn) {
		background: #eff5ff;
		color: #2354bb;
		font-size: 12px;
		padding: 10px 12px;
	}
	.credits-panel :global(.person-search) {
		border: 1px solid #e8edf4;
		background: #f8fafc;
		padding: 18px;
	}
	.credits-panel :global(.empty) {
		border: 1px dashed #d6dfeb;
		background: #fafbfd;
		text-align: center;
		font-size: 12px;
		padding: 22px 12px;
	}
	.credits-panel :global(input),
	.credits-panel :global(select) {
		font-size: 13px;
	}
	.credits-panel :global(label) {
		font-size: 12px;
	}
	.credits-panel :global(.credit-info) {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.credits-panel :global(button:focus-visible),
	.credits-panel :global(input:focus-visible),
	.credits-panel :global(select:focus-visible) {
		outline: 3px solid #93b5ff;
		outline-offset: 2px;
	}
	.poster-panel {
		padding: 22px;
	}
	.poster-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.poster-heading h2 {
		font-size: 16px;
	}
	.poster-intro {
		color: var(--muted);
		font-size: 12px;
		margin: 6px 0 20px;
		line-height: 1.6;
	}
	.poster-preview {
		aspect-ratio: 2 / 3;
		display: grid;
		place-items: center;
		border: 1px dashed #ccd7e6;
		border-radius: 9px;
		overflow: hidden;
		background: #f3f6fa;
	}
	.poster-preview.has-poster {
		border-style: solid;
		background: #edf1f6;
	}
	.poster-preview img {
		display: block;
		width: 100%;
		height: 100%;
		max-height: 380px;
		object-fit: contain;
	}
	.poster-placeholder {
		display: flex;
		align-items: center;
		flex-direction: column;
		text-align: center;
		padding: 16px;
		color: #71829a;
		gap: 14px;
	}
	.poster-placeholder strong {
		font-size: 13px;
		font-weight: 550;
		color: #50627c;
	}
	.poster-placeholder span {
		font-size: 11px;
		line-height: 1.7;
		max-width: 170px;
	}
	.movie-caption {
		display: flex;
		flex-direction: column;
		gap: 5px;
		margin: 15px 0 20px;
	}
	.movie-caption strong {
		font-size: 14px;
		overflow-wrap: anywhere;
		line-height: 1.5;
	}
	.movie-caption > span {
		color: var(--muted);
		font-size: 12px;
	}
	button {
		font: inherit;
		cursor: pointer;
		transition:
			background 0.15s,
			box-shadow 0.15s;
	}
	.source-switch {
		display: grid;
		grid-template-columns: 1fr 1fr;
		background: #f1f4f8;
		padding: 4px;
		border-radius: 8px;
		gap: 4px;
		margin-bottom: 18px;
	}
	.source-switch button {
		font-size: 11px;
		padding: 9px 4px;
		border: 0;
		border-radius: 5px;
		background: transparent;
		color: #59687b;
	}
	.source-switch button[aria-pressed='true'] {
		background: white;
		color: var(--ink);
		font-weight: 650;
		box-shadow: 0 1px 4px #18263814;
	}
	.upload-zone {
		text-align: center;
	}
	.upload-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		border: 1px solid #cdd9eb;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 650;
		padding: 11px;
		cursor: pointer;
		color: #2653a2;
	}
	.upload-button:hover {
		background: #f2f7ff;
	}
	.upload-button > span {
		font-size: 18px;
	}
	.upload-zone .hint {
		margin-top: 9px;
	}
	.file-details {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 8px;
		margin-top: 14px;
		font-size: 11px;
	}
	.file-details > span {
		min-width: 0;
		overflow-wrap: anywhere;
		line-height: 1.6;
	}
	.file-details small {
		display: block;
		color: var(--muted);
	}
	.text-button {
		border: 0;
		padding: 3px 0;
		background: none;
		font-size: 11px;
		color: #af3543;
	}
	.url-field input {
		font-size: 12px;
	}
	.aside-note {
		color: var(--muted);
		line-height: 1.8;
		font-size: 11px;
		margin: 14px 14px 0;
	}
	.artwork-error {
		color: #b42336;
		font-size: 12px;
		line-height: 1.6;
	}
	.save-bar {
		position: sticky;
		bottom: 12px;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 20px;
		padding: 18px 22px;
		background: #fff;
		border: 1px solid var(--line);
		border-radius: 12px;
		box-shadow: 0 8px 30px #1826380d;
		margin-top: 26px;
	}
	.save-summary {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.save-summary strong {
		font-size: 12px;
		font-weight: 650;
	}
	.save-summary > span {
		color: var(--muted);
		font-size: 11px;
		line-height: 1.6;
	}
	.form-actions {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		gap: 12px;
	}
	.form-actions button {
		min-height: 42px;
		padding: 11px 18px;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 650;
	}
	.cancel-button {
		background: white;
		border: 1px solid var(--line);
		color: #526176;
	}
	.cancel-button:hover {
		background: #f8fafc;
	}
	.create-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 16px;
		border: 1px solid var(--blue);
		background: var(--blue);
		color: white;
	}
	.create-button:hover:not(:disabled) {
		background: #1d4ed8;
		box-shadow: 0 3px 9px #2563eb26;
	}
	button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	fieldset:disabled .upload-button {
		opacity: 0.55;
		cursor: not-allowed;
	}
	progress {
		width: 180px;
		max-width: 100%;
		height: 6px;
		accent-color: var(--blue);
	}
	.error-banner {
		border: 1px solid #f3c7ce;
		background: #fff4f5;
		color: #9a2535;
		border-radius: 9px;
		padding: 16px 20px;
		margin-top: 22px;
		font-size: 13px;
		line-height: 1.6;
		overflow-wrap: anywhere;
	}
	.error-banner p {
		margin: 4px 0 0;
	}
	.spinner {
		width: 12px;
		height: 12px;
		border: 2px solid #ffffff66;
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
	@media (max-width: 900px) {
		.editor-grid {
			grid-template-columns: minmax(0, 1fr) 260px;
			gap: 18px;
		}
		.panel {
			padding: 20px;
		}
		.details-row {
			grid-template-columns: 1fr;
			gap: 20px;
		}
		.credits-panel :global(.section-header) {
			flex-direction: column;
		}
	}
	@media (max-width: 700px) {
		.page-heading {
			align-items: start;
			flex-direction: column;
			gap: 14px;
			margin-bottom: 22px;
		}
		.editor-grid {
			grid-template-columns: 1fr;
		}
		.poster-column {
			max-width: none;
		}
		.poster-preview {
			max-width: 240px;
			margin: 0 auto;
		}
		.poster-panel {
			padding: 22px;
		}
		.movie-caption {
			text-align: center;
		}
		.save-bar {
			padding: 14px;
			gap: 12px;
			flex-wrap: wrap;
			bottom: 8px;
		}
		.save-summary {
			flex-basis: 100%;
		}
		.form-actions {
			width: 100%;
		}
		.create-button {
			flex: 1;
		}
		.form-actions button {
			min-height: 44px;
		}
		.back-link {
			margin-bottom: 22px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		*,
		*::before,
		*::after {
			animation: none !important;
			transition: none !important;
		}
	}
</style>
