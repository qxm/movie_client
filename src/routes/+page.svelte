<script lang="ts">
	import { onMount } from 'svelte';
	import MovieList from '#lib/components/MovieList.svelte';
	import { getMovies, type Movie } from '#lib/api/movies';

	let movies = $state<Movie[]>([]);
	let loading = $state(true);
	let error = $state('');
	let keyword = $state('');
	let sort = $state('title-asc');
	let view = $state<'list' | 'grid'>('list');
	const filteredMovies = $derived.by(() => {
		const query = keyword.trim().toLocaleLowerCase();
		const filtered = movies.filter(
			(movie) =>
				!query ||
				movie.title.toLocaleLowerCase().includes(query) ||
				(movie.releaseYear > 0 && String(movie.releaseYear).includes(query)) ||
				movie.credits?.some((credit) => credit.person?.name.toLocaleLowerCase().includes(query))
		);
		return [...filtered].sort((a, b) => {
			const titles = a.title.localeCompare(b.title);
			if (sort === 'title-desc') return -titles;
			if (sort === 'year-desc' || sort === 'year-asc') {
				if (!a.releaseYear && b.releaseYear) return 1;
				if (a.releaseYear && !b.releaseYear) return -1;
				return (
					(sort === 'year-desc' ? b.releaseYear - a.releaseYear : a.releaseYear - b.releaseYear) ||
					titles
				);
			}
			return titles;
		});
	});

	async function loadMovies() {
		if (loading && !error && movies.length) return;
		loading = true;
		error = '';
		try {
			movies = await getMovies();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load movies.';
		} finally {
			loading = false;
		}
	}
	onMount(() => {
		void loadMovies();
	});
</script>

<svelte:head>
	<title>Movie Collection | Movie Manager</title>
	<meta
		name="description"
		content="Explore your movie collection, find a favorite, and discover the people behind the stories."
	/>
</svelte:head>

<div class="collection-page">
	<header class="page-heading">
		<div>
			<p class="eyebrow">YOUR MOVIE COLLECTION</p>
			<h1>Good stories live here<span>.</span></h1>
			<p class="intro">A place for every film, and the people who bring it to life.</p>
		</div>
		<a class="add-button" href="/add"><span aria-hidden="true">＋</span> Add movie</a>
	</header>

	<section class="collection" aria-labelledby="collection-title" aria-busy={loading}>
		<div class="collection-heading">
			<div class="title-with-count">
				<h2 id="collection-title">All movies</h2>
				{#if !loading && !error}<span class="count">{movies.length}</span>{/if}
			</div>
			<span class="collection-note">Your collection, at a glance</span>
		</div>

		<div class="toolbar">
			<div class="search-field">
				<svg
					viewBox="0 0 24 24"
					width="18"
					height="18"
					fill="none"
					stroke="currentColor"
					stroke-width="1.7"
					aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg
				>
				<label class="sr-only" for="collection-search">Filter movies</label>
				<input
					id="collection-search"
					type="search"
					bind:value={keyword}
					placeholder="Filter by title, year, or person…"
					disabled={loading || !!error || !movies.length}
				/>
			</div>
			<div class="toolbar-options">
				<label class="sort-control" for="collection-sort"
					><span>Sort by</span><select
						id="collection-sort"
						bind:value={sort}
						disabled={loading || !!error || !movies.length}
					>
						<option value="title-asc">Title: A–Z</option><option value="title-desc"
							>Title: Z–A</option
						><option value="year-desc">Newest year</option><option value="year-asc"
							>Oldest year</option
						>
					</select></label
				>
				<div class="view-switch" role="group" aria-label="Movie display">
					<button
						type="button"
						aria-label="List view"
						aria-pressed={view === 'list'}
						onclick={() => (view = 'list')}
						><svg
							viewBox="0 0 20 20"
							width="18"
							height="18"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							aria-hidden="true"
							><rect x="2" y="3" width="4" height="5" rx="1" /><path d="M9 4h9M9 7h6" /><rect
								x="2"
								y="12"
								width="4"
								height="5"
								rx="1"
							/><path d="M9 13h9M9 16h6" /></svg
						></button
					>
					<button
						type="button"
						aria-label="Grid view"
						aria-pressed={view === 'grid'}
						onclick={() => (view = 'grid')}
						><svg
							viewBox="0 0 20 20"
							width="18"
							height="18"
							fill="none"
							stroke="currentColor"
							stroke-width="1.5"
							aria-hidden="true"
							><rect x="2" y="2" width="6" height="6" rx="1" /><rect
								x="12"
								y="2"
								width="6"
								height="6"
								rx="1"
							/><rect x="2" y="12" width="6" height="6" rx="1" /><rect
								x="12"
								y="12"
								width="6"
								height="6"
								rx="1"
							/></svg
						></button
					>
				</div>
			</div>
		</div>

		{#if loading}
			<p class="results-note" role="status">Loading your collection…</p>
			<div class="skeleton-list" aria-hidden="true">
				{#each [1, 2, 3] as item (item)}<div class="skeleton-card">
						<div class="skeleton-poster"></div>
						<div class="skeleton-content"><span></span><span></span><span></span></div>
					</div>{/each}
			</div>
		{:else if error}
			<div class="state-panel error-panel" role="alert">
				<span class="state-icon" aria-hidden="true">!</span>
				<h3>We couldn’t load your collection</h3>
				<p>Check your connection and try again. Your movies are still there.</p>
				<details>
					<summary>Error details</summary>
					<p class="error-details">{error}</p>
				</details>
				<button type="button" class="state-button" onclick={loadMovies}>Try again</button>
			</div>
		{:else if movies.length === 0}
			<div class="state-panel">
				<span class="state-icon" aria-hidden="true">＋</span>
				<h3>Your next favorite belongs here</h3>
				<p>Start your collection with a film you love.</p>
				<a class="state-button" href="/add"
					>Add your first movie <span aria-hidden="true">↗</span></a
				>
			</div>
		{:else}
			<div class="results-row">
				<p class="results-note" role="status">
					{keyword.trim() ? `${filteredMovies.length} of ${movies.length}` : movies.length} movie{(keyword.trim()
						? filteredMovies.length
						: movies.length) === 1
						? ''
						: 's'}{keyword.trim() ? ' matched' : ' in your collection'}
				</p>
				{#if keyword.trim()}<button
						class="clear-filter"
						type="button"
						onclick={() => (keyword = '')}>Clear filter ×</button
					>{/if}
			</div>
			{#if filteredMovies.length}
				<MovieList movies={filteredMovies} {view} />
			{:else}
				<div class="state-panel">
					<span class="state-icon" aria-hidden="true">⌕</span>
					<h3>No matching movies</h3>
					<p>Try another title, release year, or cast and crew member.</p>
					<button class="state-button" type="button" onclick={() => (keyword = '')}
						>Show all movies</button
					>
				</div>
			{/if}
		{/if}
	</section>
	<p class="collection-footer">Every movie has a story. Keep yours together.</p>
</div>

<style>
	.collection-page {
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
		padding: 16px 0 4px;
	}
	.page-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 24px;
		padding: 12px 0 36px;
		border-bottom: 1px solid var(--line);
		margin-bottom: 30px;
	}
	.eyebrow {
		color: var(--blue);
		font-size: 11px;
		font-weight: 750;
		letter-spacing: 1.8px;
		margin: 0 0 12px;
	}
	h1 {
		font-size: clamp(28px, 3.5vw, 40px);
		line-height: 1.2;
		letter-spacing: -1.5px;
		margin: 0 0 12px;
		font-weight: 750;
	}
	h1 > span {
		color: var(--blue);
	}
	.intro {
		margin: 0;
		color: var(--muted);
		font-size: 13px;
		line-height: 1.8;
	}
	a {
		text-decoration: none;
	}
	button,
	input,
	select {
		font: inherit;
	}
	button,
	select {
		cursor: pointer;
	}
	.add-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 12px;
		padding: 12px 19px;
		border-radius: 8px;
		color: white;
		background: var(--blue);
		font-size: 13px;
		font-weight: 650;
		white-space: nowrap;
		box-shadow: 0 3px 8px #2563eb15;
	}
	.add-button:hover {
		background: #1d4ed8;
	}
	.add-button > span {
		font-size: 19px;
		line-height: 1;
		font-weight: 400;
	}
	.collection-heading {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		margin-bottom: 18px;
	}
	.title-with-count {
		display: flex;
		align-items: center;
		gap: 10px;
	}
	h2 {
		font-size: 18px;
		margin: 0;
		letter-spacing: -0.4px;
	}
	.count {
		background: #edf3ff;
		color: #2857b3;
		padding: 3px 9px;
		border-radius: 6px;
		font-size: 11px;
		font-weight: 650;
	}
	.collection-note {
		font-size: 11px;
		color: var(--muted);
	}
	.toolbar {
		display: flex;
		align-items: center;
		gap: 18px;
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 12px;
		background: #f8fafc;
	}
	.search-field {
		flex: 1;
		min-width: 0;
		display: flex;
		align-items: center;
		gap: 10px;
		background: white;
		border: 1px solid #d8e0ea;
		border-radius: 7px;
		padding-left: 12px;
		color: #8190a4;
	}
	.search-field svg {
		flex-shrink: 0;
	}
	.search-field input {
		width: 100%;
		box-sizing: border-box;
		min-width: 0;
		border: 0;
		border-radius: 7px;
		padding: 11px 12px 11px 0;
		font-size: 12px;
		color: var(--ink);
		background: transparent;
	}
	.search-field input::placeholder {
		color: #7b889a;
	}
	.search-field:focus-within {
		outline: 3px solid #2563eb18;
		border-color: var(--blue);
	}
	.search-field input:focus {
		outline: none;
	}
	.toolbar-options {
		display: flex;
		align-items: center;
		gap: 18px;
		flex-shrink: 0;
	}
	.sort-control {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		color: var(--muted);
	}
	select {
		max-width: 155px;
		border: 1px solid #d8e0ea;
		background: white;
		color: var(--ink);
		padding: 10px 8px;
		border-radius: 7px;
		font-size: 12px;
	}
	.view-switch {
		display: flex;
		border: 1px solid #d8e0ea;
		background: white;
		padding: 3px;
		border-radius: 7px;
		gap: 3px;
	}
	.view-switch button {
		display: grid;
		place-items: center;
		width: 34px;
		height: 32px;
		border: 0;
		border-radius: 4px;
		background: transparent;
		color: #7c8ba0;
	}
	.view-switch button[aria-pressed='true'] {
		background: #edf3ff;
		color: var(--blue);
	}
	button:disabled,
	select:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.results-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		min-height: 48px;
	}
	.results-note {
		font-size: 11px;
		color: var(--muted);
		line-height: 1.7;
		margin: 16px 0;
	}
	.clear-filter {
		color: #2d5ab4;
		background: none;
		border: 0;
		padding: 6px 0;
		font-size: 11px;
	}
	.state-panel {
		display: flex;
		align-items: center;
		flex-direction: column;
		text-align: center;
		border: 1px dashed #d6dfeb;
		border-radius: 12px;
		padding: 50px 24px;
		margin-top: 22px;
		background: #fafbfd;
	}
	.state-icon {
		width: 48px;
		height: 48px;
		border-radius: 14px;
		display: grid;
		place-items: center;
		color: #4671bc;
		background: #eaf1ff;
		font-size: 28px;
		margin-bottom: 18px;
	}
	.state-panel h3 {
		font-size: 18px;
		margin: 0 0 8px;
	}
	.state-panel p {
		font-size: 12px;
		line-height: 1.8;
		color: var(--muted);
		margin: 0;
	}
	.state-button {
		display: inline-flex;
		align-items: center;
		gap: 14px;
		background: var(--blue);
		color: white;
		border: 0;
		border-radius: 7px;
		padding: 12px 18px;
		font-size: 12px;
		font-weight: 650;
		margin-top: 22px;
	}
	.error-panel {
		background: #fffafa;
		border-color: #f0d1d5;
	}
	.error-panel .state-icon {
		background: #fcecef;
		color: #b54759;
	}
	details {
		font-size: 11px;
		color: var(--muted);
		margin-top: 16px;
		max-width: 100%;
	}
	summary {
		cursor: pointer;
	}
	.error-details {
		overflow-wrap: anywhere;
		margin-top: 12px !important;
	}
	.collection-footer {
		text-align: center;
		font-size: 11px;
		color: #7e8da1;
		margin: 30px 0 0;
		line-height: 1.8;
	}
	.skeleton-list {
		display: grid;
		gap: 16px;
	}
	.skeleton-card {
		display: flex;
		gap: 24px;
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 18px;
	}
	.skeleton-poster {
		width: 112px;
		height: 168px;
		background: #edf1f6;
		border-radius: 7px;
	}
	.skeleton-content {
		flex: 1;
		padding: 8px 0;
	}
	.skeleton-content span {
		display: block;
		height: 12px;
		max-width: 90%;
		background: #edf1f6;
		border-radius: 5px;
		margin: 0 0 20px;
	}
	.skeleton-content span:first-child {
		height: 21px;
		width: 40%;
	}
	.skeleton-content span:last-child {
		width: 65%;
	}
	:is(button, a, select):focus-visible {
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
	@media (max-width: 700px) {
		.page-heading {
			flex-direction: column;
			align-items: start;
			padding-bottom: 24px;
			margin-bottom: 24px;
			gap: 20px;
		}
		.toolbar {
			flex-direction: column;
			align-items: stretch;
			gap: 12px;
		}
		.toolbar-options {
			justify-content: space-between;
		}
		.collection-note {
			display: none;
		}
		.search-field input {
			font-size: 12px;
		}
		.sort-control {
			gap: 10px;
		}
		.skeleton-poster {
			width: 84px;
			height: 126px;
		}
		.skeleton-card {
			gap: 16px;
			padding: 14px;
		}
	}
</style>
