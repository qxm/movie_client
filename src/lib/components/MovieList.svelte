<script lang="ts">
	import Movie from './Movie.svelte';
	import type { Movie as MovieType } from '#lib/types';
	let { movies, view = 'list' }: { movies: MovieType[]; view?: 'list' | 'grid' } = $props();
</script>

<div class="movie-list" class:grid={view === 'grid'}>
	{#each movies as movie (movie.id)}<Movie {movie} {view} />{/each}
</div>

<style>
	.movie-list {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 16px;
	}
	.movie-list.grid {
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 22px;
	}
	@media (max-width: 900px) {
		.movie-list.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
			gap: 16px;
		}
	}
	@media (max-width: 500px) {
		.movie-list.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
