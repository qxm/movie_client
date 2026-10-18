<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { personHref } from '#lib/navigation/person';
	import { graphql } from '#lib/api/graphql';

	interface MovieSearchResult {
		id: string;
		title: string;
		releaseYear?: number | null;
		artworkUrl?: string | null;
		synopsis?: string | null;
	}
	interface PersonSearchResult {
		id: string;
		name: string;
		biography?: string | null;
	}
	type Filter = 'all' | 'movies' | 'people';
	const GET_MOVIES = `query GetMoviesForSearch { movies { id title releaseYear artworkUrl synopsis } }`;
	const SEARCH_PEOPLE = `query SearchPeople($keyword: String!) { searchPeople(keyword: $keyword) { id name biography } }`;
	const routeQuery = $derived(page.url.searchParams.get('q') ?? '');
	const filter = $derived.by((): Filter => {
		const selected = page.url.searchParams.get('filter');
		return selected === 'movies' || selected === 'people' ? selected : 'all';
	});
	let keyword = $state('');
	let submittedKeyword = $state('');
	let loading = $state(false);
	let searched = $state(false);
	let error = $state('');
	let movies = $state<MovieSearchResult[]>([]);
	let people = $state<PersonSearchResult[]>([]);
	let failedPosters = $state<Record<string, boolean>>({});
	let searchInput = $state<HTMLInputElement>();
	let requestSequence = 0;
	const returnToSearch = $derived(
		'/search?' + new URLSearchParams({ q: submittedKeyword, filter }).toString()
	);
	const visibleCount = $derived(
		filter === 'movies'
			? movies.length
			: filter === 'people'
				? people.length
				: movies.length + people.length
	);
	const categories: { value: Filter; label: string }[] = [
		{ value: 'all', label: 'All results' },
		{ value: 'movies', label: 'Movies' },
		{ value: 'people', label: 'People' }
	];
	function categoryCount(value: Filter) {
		return value === 'movies'
			? movies.length
			: value === 'people'
				? people.length
				: movies.length + people.length;
	}
	function searchUrl(query: string, selected: Filter) {
		const params = new URLSearchParams();
		if (query) params.set('q', query);
		if (selected !== 'all') params.set('filter', selected);
		return '/search' + (params.size ? '?' + params.toString() : '');
	}
	async function submitSearch(event: SubmitEvent) {
		event.preventDefault();
		const query = keyword.trim();
		if (!query) return;
		if (query === routeQuery) await runSearch(query);
		else await goto(searchUrl(query, filter), { reset: false });
	}
	async function changeFilter(selected: Filter) {
		await goto(searchUrl(routeQuery, selected), { reset: false });
	}
	async function clearSearch() {
		keyword = '';
		if (routeQuery) await goto(searchUrl('', filter), { reset: false });
		else await runSearch('');
		searchInput?.focus();
	}
	async function runSearch(query: string) {
		const sequence = ++requestSequence;
		submittedKeyword = query;
		error = '';
		searched = false;
		movies = [];
		people = [];
		failedPosters = {};
		if (!query.trim()) {
			loading = false;
			return;
		}
		loading = true;
		try {
			const [movieData, personData] = await Promise.all([
				graphql<{ movies: MovieSearchResult[] }>(GET_MOVIES),
				graphql<{ searchPeople: PersonSearchResult[] }>(SEARCH_PEOPLE, { keyword: query })
			]);
			if (sequence !== requestSequence) return;
			const normalized = query.trim().toLocaleLowerCase();
			movies = (movieData.movies ?? [])
				.filter((movie) => movie.title.toLocaleLowerCase().includes(normalized))
				.sort((a, b) => a.title.localeCompare(b.title));
			people = (personData.searchPeople ?? []).toSorted((a, b) => a.name.localeCompare(b.name));
			searched = true;
		} catch (e) {
			if (sequence === requestSequence)
				error = e instanceof Error ? e.message : 'Search failed. Please retry.';
		} finally {
			if (sequence === requestSequence) loading = false;
		}
	}
	$effect(() => {
		const query = routeQuery;
		untrack(() => {
			keyword = query;
			void runSearch(query);
		});
	});
	onDestroy(() => {
		requestSequence++;
	});
</script>

<svelte:head
	><title>Search | Movie Manager</title><meta
		name="description"
		content="Find movies, actors, directors and other creators in your collection."
	/></svelte:head
>

<div class="search-page">
	<header class="page-heading">
		<div>
			<p class="eyebrow">EXPLORE YOUR COLLECTION</p>
			<h1>Find your next story<span>.</span></h1>
			<p class="intro">Search the movies you love and the people who bring them to life.</p>
		</div>
		<a class="collection-link" href="/">Browse all movies <span aria-hidden="true">↗</span></a>
	</header>
	<section class="search-panel" aria-label="Search your collection">
		<form class="search-form" onsubmit={submitSearch} role="search">
			<div class="input-wrapper">
				<svg
					viewBox="0 0 24 24"
					width="22"
					height="22"
					fill="none"
					stroke="currentColor"
					stroke-width="1.6"
					aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg
				><label class="sr-only" for="search-keyword">Search movies and people</label><input
					bind:this={searchInput}
					id="search-keyword"
					type="search"
					bind:value={keyword}
					placeholder="Enter a movie title or a person’s name…"
					autocomplete="off"
				/>{#if keyword}<button
						class="clear-button"
						type="button"
						aria-label="Clear search"
						onclick={clearSearch}>×</button
					>{/if}
			</div>
			<button class="search-button" type="submit" disabled={loading || !keyword.trim()}
				>{#if loading}<span class="spinner" aria-hidden="true"></span>{/if}{loading
					? 'Searching…'
					: 'Search'}{#if !loading}<span aria-hidden="true">↗</span>{/if}</button
			>
		</form>
		<div class="search-options">
			<div class="filters" role="group" aria-label="Result category">
				{#each categories as category (category.value)}<button
						type="button"
						aria-pressed={filter === category.value}
						class:active={filter === category.value}
						onclick={() => changeFilter(category.value)}
						>{category.label}{#if searched && !loading && !error}<span
								>{categoryCount(category.value)}</span
							>{/if}</button
					>{/each}
			</div>
			<span class="search-hint">Search by title or name</span>
		</div>
	</section>

	<section class="results-area" aria-label="Search results" aria-busy={loading}>
		{#if loading}
			<p class="result-summary" role="status">Searching for “{submittedKeyword}”…</p>
			<div class="loading-grid" aria-hidden="true">
				{#each [1, 2, 3, 4] as item (item)}<div class="skeleton-card">
						<div></div>
						<span><i></i><i></i><i></i></span>
					</div>{/each}
			</div>
		{:else if error}
			<div class="state-panel error-panel" role="alert">
				<span class="state-icon" aria-hidden="true">!</span>
				<h2>We couldn’t complete your search</h2>
				<p>Check your connection and try again.</p>
				<details>
					<summary>Error details</summary>
					<p>{error}</p>
				</details>
				<button class="state-button" type="button" onclick={() => runSearch(submittedKeyword)}
					>Try again</button
				>
			</div>
		{:else if !searched}
			<div class="state-panel initial-state">
				<span class="state-icon" aria-hidden="true"
					><svg
						viewBox="0 0 24 24"
						width="30"
						height="30"
						fill="none"
						stroke="currentColor"
						stroke-width="1.3"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></svg
					></span
				>
				<h2>A title. A name. A new discovery.</h2>
				<p>Enter a movie title, actor, director, writer or producer to explore your collection.</p>
				<div class="search-types">
					<span>Movies &amp; their stories</span><span aria-hidden="true">·</span><span
						>People behind the scenes</span
					>
				</div>
			</div>
		{:else}
			<div class="summary-row">
				<p class="result-summary" role="status">
					{visibleCount} result{visibleCount === 1 ? '' : 's'} for
					<strong>“{submittedKeyword}”</strong>
				</p>
				<button class="reset-button" type="button" onclick={clearSearch}>Clear search ×</button>
			</div>
			{#if visibleCount === 0}
				<div class="state-panel">
					<span class="state-icon" aria-hidden="true">⌕</span>
					<h2>
						No {filter === 'movies' ? 'movies' : filter === 'people' ? 'people' : 'results'} found
					</h2>
					<p>
						Try a shorter name or a different spelling.{filter !== 'all' &&
						movies.length + people.length > 0
							? ' You may find a match in another category.'
							: ''}
					</p>
					<div class="state-actions">
						{#if filter !== 'all' && movies.length + people.length > 0}<button
								class="state-button"
								type="button"
								onclick={() => changeFilter('all')}>View all results</button
							>{:else}<button
								class="state-button"
								type="button"
								onclick={() => searchInput?.focus()}>Try another search</button
							>{/if}
					</div>
				</div>
			{:else}
				<div class="results-layout" class:single-category={filter !== 'all'}>
					{#if filter !== 'people'}<section
							class="result-section"
							aria-labelledby="movie-results-heading"
						>
							<div class="section-heading">
								<div>
									<h2 id="movie-results-heading">Movies</h2>
									<span class="section-count">{movies.length}</span>
								</div>
								<span class="section-note">Stories in your collection</span>
							</div>
							<div class="movie-results">
								{#each movies as movie (movie.id)}<a
										class="result-card movie-result"
										href={`/movies/${movie.id}`}
										><div class="poster">
											{#if movie.artworkUrl && !failedPosters[movie.id]}<img
													src={movie.artworkUrl}
													alt={`${movie.title} poster`}
													loading="lazy"
													onerror={() => (failedPosters[movie.id] = true)}
												/>{:else}<svg
													viewBox="0 0 24 24"
													width="27"
													height="27"
													fill="none"
													stroke="currentColor"
													stroke-width="1.2"
													aria-hidden="true"
													><rect x="3" y="3" width="18" height="18" rx="3" /><path
														d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"
													/></svg
												><span class="sr-only">No poster available</span>{/if}
										</div>
										<div class="result-info">
											<span class="result-type"
												>MOVIE <span aria-hidden="true">·</span>
												{movie.releaseYear || 'Year unknown'}</span
											>
											<h3>{movie.title}</h3>
											<p class="description">
												{movie.synopsis || 'Discover the story and the people behind this movie.'}
											</p>
											<span class="result-action">View movie <span aria-hidden="true">↗</span></span
											>
										</div></a
									>{:else}<p class="category-empty">No movies matched this search.</p>{/each}
							</div>
						</section>{/if}
					{#if filter !== 'movies'}<section
							class="result-section"
							aria-labelledby="people-results-heading"
						>
							<div class="section-heading">
								<div>
									<h2 id="people-results-heading">People</h2>
									<span class="section-count">{people.length}</span>
								</div>
								<span class="section-note">The people behind the stories</span>
							</div>
							<div class="person-results">
								{#each people as person (person.id)}<a
										class="result-card person-result"
										href={personHref(person.id, returnToSearch)}
										><div class="avatar" aria-hidden="true">
											{person.name
												.split(/\s+/)
												.filter(Boolean)
												.slice(0, 2)
												.map((part) => part[0])
												.join('')
												.toUpperCase()}
										</div>
										<div class="result-info">
											<span class="result-type">PERSON</span>
											<h3>{person.name}</h3>
											<p class="description">
												{person.biography ||
													'View their profile and get to know the person behind the name.'}
											</p>
											<span class="result-action"
												>View profile <span aria-hidden="true">↗</span></span
											>
										</div></a
									>{:else}<p class="category-empty">No people matched this search.</p>{/each}
							</div>
							{#if people.length === 20}<p class="limit-note">
									Showing up to 20 matching people. Refine your search for more specific results.
								</p>{/if}
						</section>{/if}
				</div>
			{/if}
		{/if}
	</section>
	<p class="page-footer">Every great movie is a collaboration. Find the story and its people.</p>
</div>

<style>
	.search-page {
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
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		padding: 12px 0 32px;
	}
	.eyebrow {
		font-size: 11px;
		font-weight: 750;
		letter-spacing: 1.8px;
		color: var(--blue);
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
		color: var(--muted);
		font-size: 13px;
		line-height: 1.8;
		margin: 0;
	}
	.collection-link {
		color: #526d96;
		text-decoration: none;
		font-size: 12px;
		white-space: nowrap;
		display: flex;
		gap: 14px;
		align-items: center;
	}
	.collection-link:hover {
		color: var(--blue);
	}
	.search-panel {
		border: 1px solid var(--line);
		border-radius: 12px;
		background: #f8fafc;
		padding: 22px 22px 0;
	}
	.search-form {
		display: flex;
		gap: 12px;
	}
	.input-wrapper {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		flex: 1;
		padding-left: 16px;
		background: white;
		border: 1px solid #d3ddeb;
		border-radius: 8px;
		color: #8194ae;
	}
	.input-wrapper > svg {
		flex-shrink: 0;
	}
	input {
		box-sizing: border-box;
		flex: 1;
		min-width: 0;
		width: 100%;
		border: 0;
		padding: 16px 8px 16px 0;
		font: inherit;
		font-size: 13px;
		color: var(--ink);
		background: transparent;
	}
	input::placeholder {
		color: #8998ac;
	}
	input:focus {
		outline: none;
	}
	input::-webkit-search-cancel-button {
		display: none;
	}
	.input-wrapper:focus-within {
		border-color: var(--blue);
		box-shadow: 0 0 0 3px #2563eb15;
	}
	button {
		cursor: pointer;
		font: inherit;
	}
	.clear-button {
		width: 32px;
		height: 32px;
		margin-right: 6px;
		flex-shrink: 0;
		color: #8494aa;
		border: 0;
		border-radius: 5px;
		background: transparent;
		font-size: 21px;
	}
	.clear-button:hover {
		background: #f1f5fa;
	}
	.search-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 20px;
		min-width: 128px;
		padding: 13px 20px;
		border-radius: 8px;
		border: 1px solid var(--blue);
		background: var(--blue);
		color: white;
		font-size: 12px;
		font-weight: 650;
	}
	.search-button:hover:not(:disabled),
	.state-button:hover {
		background: #1d4ed8;
	}
	.search-button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.search-options {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 18px;
		margin-top: 18px;
	}
	.filters {
		display: flex;
		gap: 22px;
	}
	.filters button {
		display: flex;
		align-items: center;
		gap: 7px;
		border: 0;
		border-bottom: 2px solid transparent;
		background: transparent;
		color: #7e8ea5;
		font-size: 12px;
		padding: 12px 1px 14px;
		margin-bottom: -1px;
		white-space: nowrap;
	}
	.filters button.active {
		color: var(--blue);
		border-color: var(--blue);
		font-weight: 650;
	}
	.filters button > span {
		font-size: 9px;
		min-width: 13px;
		text-align: center;
		padding: 2px 5px;
		border-radius: 4px;
		background: #eaf0f8;
		color: #6d809c;
	}
	.filters button.active > span {
		color: #2c5bb8;
		background: #e5eeff;
	}
	.search-hint {
		color: #93a0b2;
		font-size: 10px;
	}
	.summary-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		margin: 26px 0 24px;
	}
	.result-summary {
		font-size: 12px;
		line-height: 1.8;
		color: #75869e;
		margin: 26px 0;
		overflow-wrap: anywhere;
	}
	.summary-row .result-summary {
		margin: 0;
	}
	.result-summary strong {
		color: #455e81;
		font-weight: 600;
	}
	.reset-button {
		border: 0;
		background: transparent;
		color: #5e7cac;
		font-size: 10px;
		padding: 6px 0;
		white-space: nowrap;
	}
	.results-layout {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		gap: 28px;
	}
	.results-layout.single-category {
		grid-template-columns: minmax(0, 1fr);
	}
	.result-section {
		min-width: 0;
	}
	.section-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 16px;
		padding-bottom: 14px;
		border-bottom: 1px solid #e7ecf4;
	}
	.section-heading > div {
		display: flex;
		gap: 9px;
		align-items: center;
	}
	h2 {
		font-size: 17px;
		line-height: 1.5;
		letter-spacing: -0.3px;
		margin: 0;
	}
	.section-count {
		color: #456ba9;
		background: #edf3ff;
		border-radius: 5px;
		padding: 3px 7px;
		font-size: 10px;
	}
	.section-note {
		color: #8a99ad;
		font-size: 10px;
		text-align: right;
	}
	.movie-results,
	.person-results {
		display: grid;
		gap: 12px;
	}
	.single-category .movie-results,
	.single-category .person-results {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}
	.result-card {
		display: flex;
		align-items: start;
		gap: 17px;
		min-width: 0;
		border: 1px solid var(--line);
		border-radius: 11px;
		background: white;
		padding: 16px;
		text-decoration: none;
		color: var(--ink);
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}
	.result-card:hover {
		border-color: #c3d3ec;
		box-shadow: 0 4px 16px #18263808;
	}
	.poster {
		display: grid;
		place-items: center;
		width: 74px;
		height: 111px;
		border-radius: 6px;
		background: #edf2f9;
		color: #92a5c1;
		overflow: hidden;
		flex-shrink: 0;
	}
	.poster img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.avatar {
		width: 50px;
		height: 50px;
		display: grid;
		place-items: center;
		flex-shrink: 0;
		border-radius: 50%;
		background: #eaf1fc;
		color: #597ebc;
		font-size: 15px;
		font-weight: 600;
		margin-top: 3px;
	}
	.result-info {
		min-width: 0;
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: start;
	}
	.result-type {
		font-size: 9px;
		line-height: 1.7;
		letter-spacing: 0.7px;
		color: #8597b0;
	}
	.result-type > span {
		margin: 0 4px;
	}
	h3 {
		margin: 5px 0 7px;
		font-size: 16px;
		line-height: 1.5;
		letter-spacing: -0.25px;
		overflow-wrap: anywhere;
	}
	.description {
		font-size: 11px;
		line-height: 1.8;
		color: #7b8ba3;
		margin: 0 0 12px;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
		overflow-wrap: anywhere;
	}
	.result-action {
		display: flex;
		gap: 16px;
		align-items: center;
		font-size: 10px;
		font-weight: 650;
		color: #3b67b5;
		margin-top: auto;
	}
	.result-action > span {
		font-size: 14px;
	}
	.category-empty {
		font-size: 12px;
		color: #8394ad;
		border: 1px dashed #dce4f1;
		border-radius: 9px;
		background: #fafcfe;
		padding: 30px 18px;
		text-align: center;
		margin: 0;
	}
	.limit-note {
		color: #8999ae;
		font-size: 10px;
		line-height: 1.8;
		margin-top: 14px;
	}
	.state-panel {
		display: flex;
		align-items: center;
		flex-direction: column;
		text-align: center;
		border: 1px dashed #d8e2f0;
		border-radius: 12px;
		background: #fafcfe;
		padding: 48px 24px;
		margin-top: 28px;
	}
	.initial-state {
		background: white;
		border-style: solid;
		border-color: #edf1f7;
		padding: 62px 24px;
	}
	.state-icon {
		width: 54px;
		height: 54px;
		display: grid;
		place-items: center;
		color: #7693c1;
		background: #edf3fd;
		border-radius: 16px;
		font-size: 26px;
		margin-bottom: 20px;
	}
	.state-panel h2 {
		font-size: 20px;
		margin-bottom: 10px;
	}
	.state-panel p {
		color: #8191a8;
		font-size: 12px;
		line-height: 1.9;
		max-width: 400px;
		margin: 0;
		overflow-wrap: anywhere;
	}
	.search-types {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 12px;
		color: #91a0b5;
		font-size: 10px;
		margin-top: 28px;
	}
	.state-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: 1px solid var(--blue);
		border-radius: 8px;
		padding: 12px 18px;
		background: var(--blue);
		color: white;
		font-size: 12px;
		font-weight: 600;
		margin-top: 22px;
	}
	.error-panel {
		background: #fffafb;
		border-color: #f0d7dd;
	}
	.error-panel .state-icon {
		color: #b25c70;
		background: #fbedf1;
	}
	details {
		color: #7d8da5;
		font-size: 11px;
		margin-top: 18px;
		max-width: 100%;
	}
	details p {
		margin-top: 10px !important;
	}
	summary {
		cursor: pointer;
	}
	.page-footer {
		font-size: 11px;
		line-height: 1.9;
		color: #8b9bb0;
		text-align: center;
		margin: 32px 0 0;
	}
	.loading-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}
	.skeleton-card {
		display: flex;
		gap: 18px;
		padding: 16px;
		border: 1px solid var(--line);
		border-radius: 11px;
	}
	.skeleton-card > div {
		width: 66px;
		height: 98px;
		background: #edf2f8;
		border-radius: 6px;
		flex-shrink: 0;
	}
	.skeleton-card > span {
		flex: 1;
		min-width: 0;
		padding-top: 10px;
	}
	.skeleton-card i {
		display: block;
		height: 10px;
		border-radius: 5px;
		background: #edf2f8;
		margin-bottom: 16px;
	}
	.skeleton-card i:first-child {
		height: 15px;
		width: 70%;
	}
	.skeleton-card i:last-child {
		width: 50%;
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
	:is(button, a):focus-visible {
		outline: 3px solid #93b5ff;
		outline-offset: 3px;
		border-radius: 5px;
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
		.results-layout {
			gap: 20px;
		}
		.section-note {
			display: none;
		}
		.result-card {
			gap: 12px;
			padding: 14px;
		}
		.poster {
			width: 60px;
			height: 90px;
		}
	}
	@media (max-width: 700px) {
		.page-heading {
			flex-direction: column;
			align-items: start;
			gap: 20px;
			padding-bottom: 24px;
		}
		.search-panel {
			padding: 16px 16px 0;
		}
		.search-form {
			flex-direction: column;
			gap: 10px;
		}
		.search-button {
			width: 100%;
			min-height: 44px;
		}
		.search-options {
			margin-top: 12px;
		}
		.search-hint {
			display: none;
		}
		.filters {
			width: 100%;
			justify-content: space-between;
			gap: 10px;
		}
		.filters button {
			font-size: 11px;
			gap: 5px;
		}
		.results-layout,
		.single-category .movie-results,
		.single-category .person-results,
		.loading-grid {
			grid-template-columns: minmax(0, 1fr);
		}
		.result-card {
			padding: 16px;
			gap: 15px;
		}
		.poster {
			width: 68px;
			height: 102px;
		}
		.section-note {
			display: block;
		}
		.results-layout {
			gap: 28px;
		}
		.summary-row {
			align-items: start;
			gap: 12px;
		}
		.result-summary {
			font-size: 11px;
		}
		.state-panel {
			padding: 38px 18px;
		}
		.state-panel h2 {
			font-size: 18px;
		}
		.state-panel p {
			font-size: 11px;
		}
		input {
			font-size: 12px;
		}
		.input-wrapper {
			padding-left: 12px;
			gap: 9px;
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
