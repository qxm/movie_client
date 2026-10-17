
<script lang="ts">
  import Movie from './Movie.svelte';
  import type { Movie as MovieType } from '#lib/api/movies';

  interface Props {
        movies: MovieType[];
  }


  let { movies } : Props = $props();
</script>

<div class="movie-list">
  {#each movies as movie (movie.id)}
    <Movie {movie} />
  {:else}
    <p class="empty">No movies found.</p>
  {/each}
</div>

<style>
  .movie-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .empty {
    padding: 24px;
    color: #777;
    text-align: center;
  }
</style>

