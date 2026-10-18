<script lang="ts">
	import { personHref } from '#lib/navigation/person';
	import { page } from '$app/state';
	import { onDestroy, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { graphql } from '#lib/api/graphql';
	import { uploadArtwork, validateArtwork } from '#lib/api/artworks';
	import CastCrewEditor from '#lib/components/CastCrewEditor.svelte';

	type Role = 'ACTOR' | 'DIRECTOR' | 'WRITER' | 'PRODUCER';
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
	interface EditableCredit {
		personId: string;
		name: string;
		role: Role;
		characterName?: string | null;
	}

	const id = $derived(page.params.id);
	let movie = $state<Movie | null>(null);
	let form = $state({ title: '', releaseYear: '', synopsis: '', artworkUrl: '' });
	let loading = $state(true);
	let saving = $state(false);
	let deleting = $state(false);
	let editing = $state(false);
	let notFound = $state(false);
	let error = $state('');
	let success = $state('');
	let posterError = $state('');
	let deleteError = $state('');
	let posterFile = $state<File | null>(null);
	let posterPreview = $state<string | null>(null);
	let posterInputKey = $state(0);
	let imageFailed = $state(false);
	let uploading = $state(false);
	let uploadProgress = $state(0);
	let editingCredits = $state<EditableCredit[]>([]);
	let deleteDialog = $state<HTMLDialogElement>();
	let uploadedPoster: { file: File; url: string } | null = null;
	let loadSequence = 0;
	const posterUrl = $derived(editing ? posterPreview || form.artworkUrl.trim() : movie?.artworkUrl);
	const displayedTitle = $derived(
		editing ? form.title.trim() || 'Untitled movie' : movie?.title || 'Movie details'
	);
	const roles = [
		{ role: 'DIRECTOR', label: 'Direction' },
		{ role: 'ACTOR', label: 'Cast' },
		{ role: 'WRITER', label: 'Writing' },
		{ role: 'PRODUCER', label: 'Production' }
	];
	const creditGroups = $derived(
		roles
			.map((group) => ({
				...group,
				members: movie?.credits?.filter((credit) => credit.role === group.role) ?? []
			}))
			.filter((group) => group.members.length)
	);
	$effect(() => {
		void posterUrl;
		imageFailed = false;
	});

	const MOVIE_FIELDS = `id title releaseYear synopsis artworkUrl credits { personId role characterName person { id name } }`;
	const MOVIE_QUERY = `query Movie($id: ID!) { movie(id: $id) { ${MOVIE_FIELDS} } }`;
	const UPDATE_MOVIE = `mutation UpdateMovie($id: ID!, $input: UpdateMovieInput!) { updateMovie(id: $id, input: $input) { ${MOVIE_FIELDS} } }`;
	const DELETE_MOVIE = `mutation DeleteMovie($id: ID!) { deleteMovie(id: $id) }`;

	function clearPosterSelection() {
		if (posterPreview) URL.revokeObjectURL(posterPreview);
		posterPreview = null;
		posterFile = null;
		uploadedPoster = null;
		posterInputKey += 1;
		posterError = '';
	}
	onDestroy(() => {
		loadSequence++;
		if (posterPreview) URL.revokeObjectURL(posterPreview);
	});
	function selectPoster(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const validationError = validateArtwork(file);
		if (validationError) {
			posterError = validationError;
			input.value = '';
			return;
		}
		if (posterPreview) URL.revokeObjectURL(posterPreview);
		posterFile = file;
		posterPreview = URL.createObjectURL(file);
		uploadedPoster = null;
		posterError = '';
	}
	function resetForm() {
		if (!movie) return;
		form = {
			title: movie.title,
			releaseYear: movie.releaseYear ? String(movie.releaseYear) : '',
			synopsis: movie.synopsis ?? '',
			artworkUrl: movie.artworkUrl ?? ''
		};
		editingCredits = (movie.credits ?? []).map((credit) => ({
			personId: credit.personId,
			name: credit.person?.name ?? 'Unknown person',
			role: credit.role as Role,
			characterName: credit.characterName ?? ''
		}));
	}
	function startEdit() {
		clearPosterSelection();
		resetForm();
		editing = true;
		error = '';
		success = '';
	}
	function cancelEdit() {
		clearPosterSelection();
		resetForm();
		editing = false;
		error = '';
	}
	async function loadMovie(movieId: string) {
		const sequence = ++loadSequence;
		loading = true;
		error = '';
		success = '';
		movie = null;
		editing = false;
		notFound = false;
		clearPosterSelection();
		deleteDialog?.close();
		try {
			const data = await graphql<{ movie: Movie | null }>(MOVIE_QUERY, { id: movieId });
			if (sequence !== loadSequence) return;
			movie = data.movie;
			notFound = !movie;
			if (movie) resetForm();
		} catch (e) {
			if (sequence === loadSequence)
				error = e instanceof Error ? e.message : 'Failed to load movie.';
		} finally {
			if (sequence === loadSequence) loading = false;
		}
	}
	async function saveMovie(event: SubmitEvent) {
		event.preventDefault();
		if (!movie || saving) return;
		if (!form.title.trim() || form.title.trim().length > 255) {
			error = 'Title is required and must be 255 characters or fewer.';
			return;
		}
		const year = form.releaseYear.trim() ? Number(form.releaseYear) : 0;
		if (year !== 0 && (!Number.isInteger(year) || year < 1888 || year > 2100)) {
			error = 'Enter a release year between 1888 and 2100, or leave it blank.';
			return;
		}
		saving = true;
		error = '';
		success = '';
		try {
			let artworkUrl = form.artworkUrl.trim();
			if (posterFile) {
				if (uploadedPoster?.file !== posterFile) {
					uploading = true;
					uploadProgress = 0;
					uploadedPoster = {
						file: posterFile,
						url: await uploadArtwork(posterFile, (progress) => (uploadProgress = progress))
					};
				}
				artworkUrl = uploadedPoster.url;
			}
			uploading = false;
			const input = {
				title: form.title.trim(),
				releaseYear: year,
				synopsis: form.synopsis.trim(),
				artworkUrl,
				credits: editingCredits.map((credit) => ({
					personId: credit.personId,
					role: credit.role,
					characterName: credit.role === 'ACTOR' ? (credit.characterName?.trim() ?? '') : ''
				}))
			};
			const data = await graphql<{ updateMovie: Movie }>(UPDATE_MOVIE, { id: movie.id, input });
			movie = data.updateMovie;
			clearPosterSelection();
			editing = false;
			success = 'Movie updated successfully.';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Update failed. Your changes are still here.';
		} finally {
			uploading = false;
			saving = false;
		}
	}
	async function deleteMovie() {
		if (!movie || deleting) return;
		deleting = true;
		deleteError = '';
		try {
			const data = await graphql<{ deleteMovie: boolean }>(DELETE_MOVIE, { id: movie.id });
			if (!data.deleteMovie) throw new Error('Movie could not be deleted. Please retry.');
			deleteDialog?.close();
			await goto('/');
		} catch (e) {
			deleteError = e instanceof Error ? e.message : 'Delete failed.';
		} finally {
			deleting = false;
		}
	}
	$effect(() => {
		const movieId = id;
		if (movieId)
			untrack(() => {
				void loadMovie(movieId);
			});
	});
</script>

<svelte:head><title>{movie?.title ?? 'Movie details'} | Movie Manager</title></svelte:head>

<div class="detail-page">
	<nav class="breadcrumb" aria-label="Breadcrumb">
		<a href="/">← Movie collection</a><span aria-hidden="true">/</span><span
			>{editing ? 'Edit movie' : 'Movie details'}</span
		>
	</nav>
	{#if loading}
		<p class="loading-note" role="status">Loading movie details…</p>
		<div class="loading-layout" aria-hidden="true">
			<div class="loading-poster"></div>
			<div class="loading-copy"><span></span><span></span><span></span></div>
		</div>
	{:else if movie}
		<div class="detail-grid">
			<aside class="poster-sidebar" aria-label="Movie artwork">
				<div class="poster-frame">
					{#if posterUrl && !imageFailed}<img
							src={posterUrl}
							alt={`Poster for ${displayedTitle}`}
							onerror={() => (imageFailed = true)}
						/>
					{:else}<div class="poster-placeholder">
							<svg
								viewBox="0 0 24 24"
								width="40"
								height="40"
								fill="none"
								stroke="currentColor"
								stroke-width="1.1"
								aria-hidden="true"
								><rect x="3" y="3" width="18" height="18" rx="3" /><path
									d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"
								/></svg
							><strong>{imageFailed ? 'Poster unavailable' : 'No poster yet'}</strong><span
								>{editing ? 'Choose an image below.' : 'Every story deserves a cover.'}</span
							>
						</div>{/if}
				</div>
				{#if editing}
					<fieldset class="poster-controls" disabled={saving}>
						<legend class="sr-only">Update poster</legend>
						{#key posterInputKey}<input
								class="sr-only file-input"
								id="poster-upload"
								type="file"
								accept="image/jpeg,image/png"
								onchange={selectPoster}
								aria-describedby="poster-hint"
							/>{/key}
						<label class="upload-button" for="poster-upload"
							>↑ {posterFile ? 'Replace selection' : 'Change poster'}</label
						>
						<p class="hint" id="poster-hint">JPEG or PNG · Up to 5 MB</p>
						{#if posterFile}<p class="file-name">{posterFile.name}</p>
							<button class="text-button" type="button" onclick={clearPosterSelection}
								>Keep current poster</button
							>{/if}
						<div class="field">
							<label for="artwork-url">Or image URL</label><input
								id="artwork-url"
								form="edit-movie"
								type="text"
								inputmode="url"
								bind:value={form.artworkUrl}
								disabled={!!posterFile}
								placeholder="https://example.com/poster.jpg"
							/>
						</div>
						{#if posterError}<p class="poster-error" role="alert">{posterError}</p>{/if}
					</fieldset>
				{:else}
					<div class="poster-caption">
						<span class="caption-label">IN YOUR COLLECTION</span>
						<p>Every movie has a story.<br />This one is part of yours.</p>
					</div>
				{/if}
			</aside>
			<div class="movie-content">
				<header class="movie-header">
					<p class="eyebrow">{editing ? 'MAKE IT YOURS' : 'MOVIE DETAILS'}</p>
					<h1>{displayedTitle}<span class="title-dot">.</span></h1>
					<div class="metadata">
						<span class="year">{movie.releaseYear || 'Year unknown'}</span><span
							class="meta-dot"
							aria-hidden="true">·</span
						><span
							>{movie.credits?.length ?? 0} cast &amp; crew credit{movie.credits?.length === 1
								? ''
								: 's'}</span
						>{#if editing}<span class="edit-badge">Editing</span>{/if}
					</div>
					{#if !editing}<div class="header-actions">
							<button type="button" class="primary-button" onclick={startEdit}
								>Edit movie <span aria-hidden="true">↗</span></button
							><button
								type="button"
								class="delete-button"
								onclick={() => {
									deleteError = '';
									deleteDialog?.showModal();
								}}>Delete movie</button
							>
						</div>{/if}
				</header>
				{#if success}<div class="notice success" role="status">
						<span aria-hidden="true">✓</span>
						{success}
					</div>{/if}
				{#if error}<div class="notice error" role="alert">
						<strong>{editing ? 'Your changes couldn’t be saved.' : 'Something went wrong.'}</strong>
						<p>{error}</p>
					</div>{/if}
				{#if editing}
					<form id="edit-movie" onsubmit={saveMovie} aria-busy={saving}>
						<fieldset class="panel edit-fields" disabled={saving}>
							<legend class="sr-only">Movie information</legend>
							<div class="panel-heading">
								<div>
									<h2>Movie information</h2>
									<p>Update the essentials of your movie.</p>
								</div>
								<span class="optional">* Required</span>
							</div>
							<div class="field-row">
								<div class="field">
									<label for="title">Movie title <span class="required">*</span></label><input
										id="title"
										bind:value={form.title}
										required
										maxlength="255"
									/>
									<p class="hint">{form.title.length}/255 characters</p>
								</div>
								<div class="field">
									<label for="year">Release year</label><input
										id="year"
										type="number"
										min="1888"
										max="2100"
										step="1"
										value={form.releaseYear}
										oninput={(event) => (form.releaseYear = event.currentTarget.value)}
										placeholder="Optional"
									/>
									<p class="hint">1888–2100, or leave blank</p>
								</div>
							</div>
							<div class="field synopsis-field">
								<label for="synopsis">Synopsis</label><textarea
									id="synopsis"
									rows="7"
									bind:value={form.synopsis}
									placeholder="Tell the story behind the movie…"></textarea>
							</div>
						</fieldset>
					</form>
					<fieldset class="panel editor-panel" disabled={saving}>
						<legend class="sr-only">Cast and crew</legend><CastCrewEditor
							bind:credits={editingCredits}
							mockMode={false}
						/>
					</fieldset>
					<footer class="save-bar">
						<div role="status">
							<strong
								>{uploading
									? uploadProgress < 100
										? `Uploading poster · ${uploadProgress}%`
										: 'Processing poster…'
									: saving
										? 'Saving changes…'
										: 'Your changes are ready to save'}</strong
							>{#if uploading}<progress
									value={uploadProgress}
									max="100"
									aria-label="Poster upload progress">{uploadProgress}%</progress
								>{:else}<span
									>{saving
										? 'Please wait a moment.'
										: 'Cancel to keep the current movie details.'}</span
								>{/if}
						</div>
						<div class="save-actions">
							<button type="button" class="secondary-button" onclick={cancelEdit} disabled={saving}
								>Cancel</button
							><button
								type="submit"
								form="edit-movie"
								class="primary-button"
								disabled={saving || !form.title.trim()}
								>{saving ? 'Saving…' : 'Save changes'}</button
							>
						</div>
					</footer>
				{:else}
					<section class="panel synopsis-panel" aria-labelledby="synopsis-heading">
						<div class="panel-heading">
							<h2 id="synopsis-heading">The story</h2>
							<span class="optional">Synopsis</span>
						</div>
						<p class="synopsis" class:muted={!movie.synopsis}>
							{movie.synopsis ||
								'No synopsis yet. Add a few words about this movie using Edit movie.'}
						</p>
					</section>
					<section class="panel credits-panel" aria-labelledby="credits-heading">
						<div class="panel-heading">
							<h2 id="credits-heading">Cast &amp; crew</h2>
							<span class="count">{movie.credits?.length ?? 0}</span>
						</div>
						{#if creditGroups.length}<div class="credit-groups">
								{#each creditGroups as group (group.role)}<section
										class="credit-group"
										aria-label={group.label}
									>
										<h3>{group.label}</h3>
										<div class="people-list">
											{#each group.members as credit, index (credit.personId + '-' + index)}<a
													class="person-card"
													href={personHref(credit.personId, `/movies/${movie.id}`)}
													><span class="avatar" aria-hidden="true"
														>{(credit.person?.name ?? '?')
															.split(/\s+/)
															.filter(Boolean)
															.slice(0, 2)
															.map((part) => part[0])
															.join('')
															.toUpperCase()}</span
													><span class="person-info"
														><strong>{credit.person?.name ?? 'Unknown person'}</strong><span
															>{group.role === 'ACTOR'
																? credit.characterName
																	? `as ${credit.characterName}`
																	: 'Actor'
																: group.role === 'DIRECTOR'
																	? 'Director'
																	: group.role === 'WRITER'
																		? 'Writer'
																		: 'Producer'}</span
														></span
													><span class="person-arrow" aria-hidden="true">↗</span></a
												>{/each}
										</div>
									</section>{/each}
							</div>
						{:else}<div class="empty-credits">
								<p>No cast or crew added yet.</p>
								<button type="button" class="text-button" onclick={startEdit}
									>Add the people behind this movie →</button
								>
							</div>{/if}
					</section>
				{/if}
			</div>
		</div>
		<dialog
			bind:this={deleteDialog}
			class="delete-dialog"
			aria-labelledby="delete-title"
			aria-describedby="delete-description"
			oncancel={(event) => {
				if (deleting) event.preventDefault();
			}}
		>
			<span class="delete-icon" aria-hidden="true">×</span>
			<h2 id="delete-title">Delete this movie?</h2>
			<p id="delete-description">
				“{movie.title}” will be removed from your collection. This action cannot be undone.
			</p>
			{#if deleteError}<p class="poster-error" role="alert">{deleteError}</p>{/if}
			<div class="dialog-actions">
				<button
					type="button"
					class="secondary-button"
					disabled={deleting}
					onclick={() => deleteDialog?.close()}>Keep movie</button
				><button type="button" class="confirm-delete" disabled={deleting} onclick={deleteMovie}
					>{deleting ? 'Deleting…' : 'Delete permanently'}</button
				>
			</div>
		</dialog>
	{:else}
		<section class="state-panel">
			<span class="state-icon" aria-hidden="true">{notFound ? '?' : '!'}</span>
			<h1>{notFound ? 'Movie not found' : 'We couldn’t load this movie'}</h1>
			<p>
				{notFound
					? 'It may have been removed from your collection.'
					: 'Check your connection and try again.'}
			</p>
			{#if error}<details>
					<summary>Error details</summary>
					<p>{error}</p>
				</details>{/if}
			<div class="state-actions">
				{#if !notFound}<button
						type="button"
						class="primary-button"
						onclick={() => id && loadMovie(id)}>Try again</button
					>{/if}<a class="secondary-button" href="/">Back to collection</a>
			</div>
		</section>
	{/if}
</div>

<style>
	.detail-page {
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
	.breadcrumb {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		font-size: 12px;
		color: #8b97a8;
		margin-bottom: 32px;
		line-height: 1.7;
	}
	.breadcrumb a {
		color: #63758e;
		text-decoration: none;
	}
	.breadcrumb a:hover {
		color: var(--blue);
	}
	.detail-grid {
		display: grid;
		grid-template-columns: 260px minmax(0, 1fr);
		gap: 38px;
		align-items: start;
	}
	.poster-sidebar,
	.movie-content {
		min-width: 0;
	}
	.poster-frame {
		aspect-ratio: 2 / 3;
		background: #f0f4f9;
		border: 1px solid var(--line);
		border-radius: 12px;
		overflow: hidden;
		box-shadow: 0 10px 25px #1826380a;
	}
	.poster-frame img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
	}
	.poster-placeholder {
		display: flex;
		height: 100%;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 16px;
		color: #8396b1;
		background: linear-gradient(145deg, #f4f7fc, #e9eff8);
		text-align: center;
		padding: 20px;
		box-sizing: border-box;
	}
	.poster-placeholder strong {
		font-size: 14px;
		font-weight: 550;
		color: #607491;
	}
	.poster-placeholder span {
		font-size: 11px;
		line-height: 1.7;
	}
	.poster-caption {
		padding: 22px 8px;
		text-align: center;
	}
	.caption-label {
		font-size: 9px;
		letter-spacing: 1.6px;
		color: var(--blue);
		font-weight: 700;
	}
	.poster-caption p {
		font-size: 11px;
		line-height: 1.9;
		color: #8291a5;
		margin: 10px 0 0;
	}
	.movie-header {
		padding: 6px 0 26px;
	}
	.eyebrow {
		color: var(--blue);
		font-size: 10px;
		letter-spacing: 1.8px;
		font-weight: 750;
		margin: 0 0 12px;
	}
	h1 {
		font-size: clamp(28px, 3.6vw, 44px);
		line-height: 1.2;
		letter-spacing: -1.5px;
		margin: 0 0 18px;
		overflow-wrap: anywhere;
	}
	.title-dot {
		color: var(--blue);
	}
	.metadata {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 12px;
		color: var(--muted);
		font-size: 12px;
		line-height: 1.6;
	}
	.year {
		background: #f1f5fa;
		color: #506582;
		border: 1px solid #e4eaf3;
		border-radius: 5px;
		padding: 4px 9px;
		font-size: 11px;
	}
	.meta-dot {
		color: #9aa9bd;
	}
	.edit-badge {
		color: #8a6323;
		background: #fff6dd;
		padding: 3px 9px;
		border-radius: 5px;
		font-size: 10px;
	}
	.header-actions {
		display: flex;
		gap: 14px;
		flex-wrap: wrap;
		margin-top: 26px;
	}
	button,
	input,
	textarea {
		font: inherit;
	}
	button,
	a {
		-webkit-tap-highlight-color: transparent;
	}
	button {
		cursor: pointer;
	}
	.primary-button,
	.secondary-button,
	.delete-button,
	.confirm-delete {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 20px;
		border-radius: 8px;
		padding: 12px 18px;
		min-height: 42px;
		box-sizing: border-box;
		font-size: 12px;
		font-weight: 650;
		text-decoration: none;
	}
	.primary-button {
		background: var(--blue);
		color: white;
		border: 1px solid var(--blue);
	}
	.primary-button:hover:not(:disabled) {
		background: #1d4ed8;
	}
	.secondary-button {
		background: white;
		border: 1px solid var(--line);
		color: #536780;
	}
	.delete-button {
		background: white;
		color: #aa4051;
		border: 1px solid #edd8de;
	}
	.delete-button:hover {
		background: #fff5f6;
	}
	.panel {
		border: 1px solid var(--line);
		border-radius: 12px;
		background: white;
		padding: 26px;
		margin: 0 0 22px;
		min-width: 0;
	}
	.panel-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		margin-bottom: 20px;
	}
	h2 {
		font-size: 17px;
		line-height: 1.5;
		letter-spacing: -0.3px;
		margin: 0;
	}
	.panel-heading p {
		color: var(--muted);
		font-size: 11px;
		margin: 5px 0 0;
		line-height: 1.7;
	}
	.optional {
		font-size: 10px;
		color: #7e8da1;
		white-space: nowrap;
	}
	.synopsis {
		font-size: 13px;
		line-height: 1.95;
		color: #52647e;
		white-space: pre-line;
		overflow-wrap: anywhere;
		margin: 0;
	}
	.synopsis.muted {
		color: #8a98aa;
		font-size: 12px;
	}
	.count {
		background: #edf3ff;
		color: #3562ba;
		padding: 3px 9px;
		font-size: 10px;
		border-radius: 5px;
	}
	.credit-groups {
		display: flex;
		flex-direction: column;
		gap: 22px;
	}
	.credit-group h3 {
		margin: 0 0 11px;
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 1.2px;
		color: #7b8ca4;
		font-weight: 650;
	}
	.people-list {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 10px;
	}
	.person-card {
		display: flex;
		align-items: center;
		gap: 12px;
		border: 1px solid #e8edf5;
		background: #fafbfd;
		border-radius: 9px;
		padding: 12px;
		color: var(--ink);
		text-decoration: none;
		min-width: 0;
	}
	.person-card:hover {
		border-color: #c6d5ef;
		background: #f4f8ff;
	}
	.avatar {
		width: 35px;
		height: 35px;
		border-radius: 50%;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		font-size: 11px;
		font-weight: 650;
		color: #5073ae;
		background: #e9eff9;
	}
	.person-info {
		min-width: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 4px;
		overflow-wrap: anywhere;
	}
	.person-info strong {
		font-size: 12px;
		line-height: 1.5;
		font-weight: 600;
	}
	.person-info > span {
		font-size: 10px;
		color: #7d8ca2;
		line-height: 1.6;
	}
	.person-arrow {
		color: #8b9ab0;
		font-size: 14px;
	}
	.empty-credits {
		text-align: center;
		border: 1px dashed #d8e1ed;
		border-radius: 8px;
		padding: 24px 14px;
	}
	.empty-credits p {
		color: #7e8fa6;
		margin: 0 0 9px;
		font-size: 12px;
	}
	.text-button {
		border: 0;
		padding: 4px 0;
		background: transparent;
		color: #3564ba;
		font-size: 11px;
	}
	.notice {
		border-radius: 9px;
		padding: 14px 16px;
		font-size: 12px;
		line-height: 1.7;
		margin-bottom: 20px;
		overflow-wrap: anywhere;
	}
	.notice p {
		margin: 4px 0 0;
	}
	.success {
		background: #f0fbf5;
		border: 1px solid #cfe9dc;
		color: #27764c;
	}
	.success > span {
		margin-right: 6px;
	}
	.error {
		background: #fff5f6;
		border: 1px solid #f1d3d9;
		color: #a0394a;
	}
	fieldset {
		min-width: 0;
	}
	.poster-controls {
		padding: 18px 0 0;
		margin: 0;
		border: 0;
	}
	.upload-button {
		display: block;
		text-align: center;
		color: #2c60b7;
		font-size: 12px;
		font-weight: 600;
		padding: 12px;
		border: 1px solid #cddbef;
		border-radius: 8px;
		background: white;
		cursor: pointer;
	}
	.poster-controls .hint {
		text-align: center;
		margin: 8px 0 16px;
	}
	.poster-controls .field {
		margin-top: 20px;
	}
	.poster-controls .text-button {
		width: 100%;
	}
	.file-name {
		font-size: 11px;
		color: var(--muted);
		overflow-wrap: anywhere;
		text-align: center;
		margin: 0 0 5px;
	}
	.poster-error {
		font-size: 12px;
		line-height: 1.7;
		color: #ad3749;
		overflow-wrap: anywhere;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 9px;
		min-width: 0;
	}
	.field label {
		font-size: 12px;
		font-weight: 650;
		color: #30435f;
	}
	.required {
		color: #b34858;
	}
	.field-row {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 155px;
		gap: 18px;
	}
	input:not([type='file']),
	textarea {
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		padding: 12px;
		border: 1px solid #d4dce7;
		border-radius: 7px;
		font-size: 12px;
		color: var(--ink);
		background: white;
	}
	textarea {
		resize: vertical;
		min-height: 160px;
		line-height: 1.8;
	}
	.hint {
		color: #7b8ba1;
		font-size: 10px;
		line-height: 1.6;
		margin: 0;
	}
	.synopsis-field {
		margin-top: 22px;
	}
	.editor-panel :global(.cast-crew-editor) {
		margin-top: 0;
	}
	.editor-panel :global(h2) {
		font-size: 17px;
	}
	.editor-panel :global(h3) {
		font-size: 13px;
	}
	.editor-panel :global(.section-header p) {
		font-size: 11px;
	}
	.editor-panel :global(.primary-btn) {
		color: #2c5eb4;
		background: #edf3ff;
		font-size: 11px;
	}
	.editor-panel :global(.section-header) {
		flex-wrap: wrap;
	}
	.editor-panel :global(.credit-info) {
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.editor-panel :global(.empty) {
		text-align: center;
		border: 1px dashed #d8e1ed;
		background: #fafbfd;
		font-size: 11px;
	}
	.editor-panel :global(.person-search) {
		border: 1px solid #e8edf5;
		background: #f8fafc;
	}
	.editor-panel :global(input),
	.editor-panel :global(select),
	.editor-panel :global(label) {
		font-size: 12px;
	}
	.save-bar {
		position: sticky;
		bottom: 12px;
		z-index: 10;
		padding: 16px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: white;
		box-shadow: 0 5px 20px #1826380d;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}
	.save-bar > div:first-child {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.save-bar strong {
		font-size: 11px;
	}
	.save-bar span {
		color: #7b8ba1;
		font-size: 10px;
		line-height: 1.5;
	}
	.save-actions {
		display: flex;
		gap: 9px;
		flex-shrink: 0;
	}
	progress {
		width: 160px;
		max-width: 100%;
		height: 6px;
		accent-color: var(--blue);
	}
	button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.delete-dialog {
		box-sizing: border-box;
		width: min(430px, calc(100% - 32px));
		border: 1px solid #e4eaf2;
		border-radius: 16px;
		padding: 28px;
		color: var(--ink);
		box-shadow: 0 20px 70px #18263833;
	}
	.delete-dialog::backdrop {
		background: #18263888;
		backdrop-filter: blur(3px);
	}
	.delete-icon {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		background: #fff0f2;
		border-radius: 12px;
		color: #b34456;
		font-size: 26px;
		margin-bottom: 18px;
	}
	.delete-dialog h2 {
		font-size: 20px;
	}
	.delete-dialog p {
		font-size: 12px;
		color: #6e7d92;
		line-height: 1.8;
		overflow-wrap: anywhere;
	}
	.dialog-actions {
		display: flex;
		justify-content: end;
		gap: 10px;
		margin-top: 24px;
		flex-wrap: wrap;
	}
	.confirm-delete {
		background: #b83b50;
		border: 1px solid #b83b50;
		color: white;
	}
	.state-panel {
		display: flex;
		align-items: center;
		flex-direction: column;
		text-align: center;
		border: 1px dashed #d8e1ed;
		border-radius: 12px;
		background: #fafbfd;
		padding: 60px 24px;
	}
	.state-icon {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: 14px;
		color: #547bb9;
		background: #eaf1ff;
		font-size: 24px;
		margin-bottom: 20px;
	}
	.state-panel h1 {
		font-size: 26px;
		letter-spacing: -0.6px;
		margin-bottom: 10px;
	}
	.state-panel p,
	details {
		font-size: 12px;
		color: var(--muted);
		line-height: 1.8;
		overflow-wrap: anywhere;
		max-width: 100%;
	}
	summary {
		cursor: pointer;
	}
	.state-actions {
		display: flex;
		gap: 12px;
		flex-wrap: wrap;
		margin-top: 20px;
		justify-content: center;
	}
	.loading-note {
		font-size: 12px;
		color: var(--muted);
	}
	.loading-layout {
		display: grid;
		grid-template-columns: 260px 1fr;
		gap: 38px;
	}
	.loading-poster {
		aspect-ratio: 2 / 3;
		border-radius: 12px;
		background: #edf2f8;
	}
	.loading-copy {
		padding-top: 20px;
	}
	.loading-copy span {
		display: block;
		height: 14px;
		border-radius: 6px;
		background: #edf2f8;
		margin-bottom: 24px;
	}
	.loading-copy span:first-child {
		height: 40px;
		width: 70%;
	}
	.loading-copy span:last-child {
		height: 120px;
		margin-top: 60px;
	}
	:is(button, a, input, textarea):focus-visible,
	.file-input:focus-visible + label {
		outline: 3px solid #93b5ff;
		outline-offset: 3px;
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
		.detail-grid {
			grid-template-columns: 210px minmax(0, 1fr);
			gap: 24px;
		}
		.panel {
			padding: 20px;
		}
		.people-list {
			grid-template-columns: minmax(0, 1fr);
		}
		.field-row {
			grid-template-columns: minmax(0, 1fr);
		}
		.save-bar {
			flex-wrap: wrap;
		}
		.save-actions {
			width: 100%;
		}
		.save-actions .primary-button {
			flex: 1;
		}
	}
	@media (max-width: 650px) {
		.detail-grid {
			grid-template-columns: minmax(0, 1fr);
			gap: 26px;
		}
		.poster-sidebar {
			width: min(240px, 100%);
			margin: 0 auto;
		}
		.poster-caption {
			display: none;
		}
		.movie-header {
			padding-top: 0;
		}
		.breadcrumb {
			margin-bottom: 24px;
		}
		.metadata {
			gap: 9px;
			font-size: 11px;
		}
		.header-actions {
			margin-top: 20px;
		}
		.loading-layout {
			grid-template-columns: 100px minmax(0, 1fr);
			gap: 20px;
		}
		.loading-copy span:last-child {
			margin-top: 20px;
		}
		.dialog-actions > button {
			flex: 1;
			padding: 11px 10px;
		}
	}
</style>
