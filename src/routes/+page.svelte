<script lang="ts">
    import { onMount } from 'svelte';

    import MovieList from '#lib/components/MovieList.svelte';
    import { getMovies, type Movie } from '#lib/api/movies';

    let movies: Movie[] = $state([]);
    let loading = $state(true);
    let error = $state('');

    onMount(async () => {
        try {
            movies = await getMovies();
        } catch (e) {
            error = e instanceof Error
                ? e.message
                : 'Failed to load movies';
        } finally {
            loading = false;
        }
    });
</script>

<h1>Movies</h1>
{#if loading}
    <p>Loading movies...</p>
{:else if error}
    <p class="error">{error}</p>
{:else if movies.length === 0}
    <p>No movies found.</p>
{:else}
    <MovieList {movies} />
{/if}
