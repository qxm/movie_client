<script lang="ts">
	import { personHref } from '#lib/navigation/person';
	import type { Movie as MovieType } from '#lib/types';
	let { movie, view = 'list' }: { movie: MovieType; view?: 'list' | 'grid' } = $props();
	let imageFailed = $state(false);
	$effect(() => {
		void movie.artworkUrl;
		imageFailed = false;
	});
	const people = $derived(
		[
			{
				label: 'Director',
				members: movie.credits?.filter((c) => c.role === 'DIRECTOR' && c.person?.name) ?? []
			},
			{
				label: 'Cast',
				members: movie.credits?.filter((c) => c.role === 'ACTOR' && c.person?.name) ?? []
			},
			{
				label: 'Writer',
				members: movie.credits?.filter((c) => c.role === 'WRITER' && c.person?.name) ?? []
			},
			{
				label: 'Producer',
				members: movie.credits?.filter((c) => c.role === 'PRODUCER' && c.person?.name) ?? []
			}
		].filter((group) => group.members.length)
	);
</script>

<article class="movie-card" class:grid-card={view === 'grid'}>
	<a class="artwork" href={`/movies/${movie.id}`} aria-label={`View ${movie.title}`}>
		{#if movie.artworkUrl && !imageFailed}
			<img
				src={movie.artworkUrl}
				alt={`${movie.title} poster`}
				loading="lazy"
				onerror={() => (imageFailed = true)}
			/>
		{:else}
			<div class="poster-placeholder">
				<svg
					viewBox="0 0 24 24"
					width="30"
					height="30"
					fill="none"
					stroke="currentColor"
					stroke-width="1.2"
					aria-hidden="true"
					><rect x="3" y="3" width="18" height="18" rx="3" /><path
						d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"
					/></svg
				><span>No poster yet</span>
			</div>
		{/if}
	</a>
	<div class="movie-info">
		<div class="movie-heading">
			<a class="movie-title" href={`/movies/${movie.id}`}><h3>{movie.title}</h3></a><span
				class="year">{movie.releaseYear || 'Year unknown'}</span
			>
		</div>
		<p class="synopsis" class:muted={!movie.synopsis}>
			{movie.synopsis || 'A story waiting to be told. Add a synopsis from the movie details page.'}
		</p>
		{#if people.length}
			<dl class="credits">
				{#each people as group (group.label)}<div>
						<dt>{group.label}</dt>
						<dd>
							{#each group.members as credit, index (index)}{#if index > 0}<span class="separator"
										>,
									</span>{/if}<a href={personHref(credit.personId, '/')}>{credit.person?.name}</a
								>{/each}
						</dd>
					</div>{/each}
			</dl>
		{:else}<p class="no-credits">No cast or crew added yet</p>{/if}
		<div class="card-footer">
			<span class="credit-count"
				>{movie.credits?.length ?? 0} credit{movie.credits?.length === 1 ? '' : 's'}</span
			><a class="details-link" href={`/movies/${movie.id}`}
				>View movie <span aria-hidden="true">↗</span></a
			>
		</div>
	</div>
</article>

<style>
	.movie-card {
		display: flex;
		gap: 24px;
		padding: 18px;
		min-width: 0;
		border: 1px solid #e2e8f0;
		border-radius: 12px;
		background: white;
		transition:
			box-shadow 0.18s,
			border-color 0.18s;
	}
	.movie-card:hover {
		border-color: #cbd8ec;
		box-shadow: 0 5px 18px #18263808;
	}
	.artwork {
		display: block;
		flex: 0 0 112px;
		width: 112px;
		height: 168px;
		border-radius: 7px;
		overflow: hidden;
		text-decoration: none;
		background: #f0f4f9;
	}
	.artwork img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.poster-placeholder {
		display: flex;
		height: 100%;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		gap: 13px;
		color: #8798b2;
		background: linear-gradient(155deg, #f2f6fc, #e7edf6);
	}
	.poster-placeholder span {
		font-size: 10px;
		text-align: center;
	}
	.movie-info {
		display: flex;
		flex-direction: column;
		flex: 1;
		min-width: 0;
		padding: 2px 2px 0 0;
	}
	.movie-heading {
		display: flex;
		align-items: baseline;
		gap: 14px;
		margin-bottom: 10px;
		flex-wrap: wrap;
	}
	.movie-title {
		color: #182638;
		text-decoration: none;
		min-width: 0;
	}
	h3 {
		font-size: 21px;
		letter-spacing: -0.6px;
		line-height: 1.4;
		margin: 0;
		overflow-wrap: anywhere;
	}
	.movie-title:hover {
		color: #2563eb;
	}
	.year {
		font-size: 11px;
		color: #677992;
		background: #f2f5f9;
		border: 1px solid #e7ecf3;
		border-radius: 5px;
		padding: 3px 8px;
		white-space: nowrap;
	}
	.synopsis {
		color: #617189;
		font-size: 12px;
		line-height: 1.8;
		margin: 0 0 12px;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		overflow: hidden;
		overflow-wrap: anywhere;
	}
	.synopsis.muted {
		color: #7e8da1;
	}
	.credits {
		display: flex;
		flex-direction: column;
		gap: 5px;
		margin: 0 0 12px;
		font-size: 11px;
		line-height: 1.7;
	}
	.credits > div {
		display: grid;
		grid-template-columns: 8ch minmax(0, 1fr);
		align-items: baseline;
		gap: 7px;
		min-width: 0;
	}
	dt {
		color: #8190a4;
		flex-shrink: 0;
	}
	dd {
		margin: 0;
		overflow-wrap: anywhere;
	}
	dd a {
		color: #43536b;
		text-decoration: none;
	}
	dd a:hover {
		color: #2563eb;
		text-decoration: underline;
	}
	.separator {
		color: #8392a6;
	}
	.no-credits {
		color: #8392a6;
		margin: 0 0 12px;
		font-size: 11px;
		line-height: 1.7;
	}
	.card-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
		margin-top: auto;
		padding-top: 9px;
	}
	.credit-count {
		font-size: 10px;
		color: #8392a6;
	}
	.details-link {
		display: flex;
		gap: 14px;
		align-items: center;
		color: #285cbf;
		text-decoration: none;
		font-size: 11px;
		font-weight: 650;
		white-space: nowrap;
	}
	.details-link:hover {
		color: #1846a1;
	}
	.details-link span {
		font-size: 16px;
	}
	a:focus-visible {
		outline: 3px solid #93b5ff;
		outline-offset: 3px;
		border-radius: 4px;
	}
	.grid-card {
		flex-direction: column;
		padding: 14px;
		gap: 16px;
	}
	.grid-card .artwork {
		width: 100%;
		height: auto;
		aspect-ratio: 2 / 3;
		flex: none;
	}
	.grid-card .movie-info {
		padding: 0 3px 3px;
	}
	.grid-card .movie-heading {
		gap: 9px;
	}
	.grid-card h3 {
		font-size: 18px;
	}
	.grid-card .credits {
		flex-direction: column;
		gap: 5px;
	}
	.grid-card .card-footer {
		border-top: 1px solid #edf1f6;
		padding-top: 12px;
	}
	@media (max-width: 600px) {
		.movie-card {
			gap: 15px;
			padding: 14px;
		}
		.artwork {
			flex-basis: 84px;
			width: 84px;
			height: 126px;
		}
		h3 {
			font-size: 17px;
			letter-spacing: -0.3px;
		}
		.movie-heading {
			gap: 7px;
			margin-bottom: 9px;
		}
		.year {
			font-size: 10px;
			padding: 2px 6px;
		}
		.synopsis {
			font-size: 11px;
			margin-bottom: 10px;
		}
		.credits {
			flex-direction: column;
			font-size: 10px;
			gap: 3px;
		}
		.card-footer {
			gap: 8px;
		}
		.details-link {
			font-size: 10px;
			gap: 6px;
		}
		.credit-count {
			font-size: 10px;
		}
		.grid-card .artwork {
			height: auto;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.movie-card {
			transition: none;
		}
	}
</style>
