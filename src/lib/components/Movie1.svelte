
<script lang="ts">
  interface Movie {
    id: string;
    title: string;
    artworkUrl: string;
    releaseYear?: number | null;
    genres?: string[];
    synopsis?: string | null;
    director?: string | null;
    cast?: string[];
    rating?: number | null;
    detailUrl?: string;
  }

  let { movie }: { movie: Movie } = $props();
</script>

<article class="item">
  <div class="artwork">
    <img
      src={movie.artworkUrl}
      alt={`${movie.title} poster`}
      loading="lazy"
    />
  </div>

  <div class="info">
    <div class="heading">
      <a href={movie.detailUrl ?? `/movies/${movie.id}`}>
        <h2 class="title">{movie.title}</h2>
      </a>

      {#if movie.releaseYear}
        <span class="year">{movie.releaseYear}</span>
      {/if}
    </div>

    {#if movie.genres?.length}
      <div class="genres">
        {#each movie.genres as genre}
          <span class="genre">{genre}</span>
        {/each}
      </div>
    {/if}

    {#if movie.rating != null}
      <div class="rating">
        <span aria-hidden="true">★</span>
        <strong>{movie.rating.toFixed(1)}</strong>
        <span class="rating-label">/ 10</span>
      </div>
    {/if}

    {#if movie.director}
      <p class="metadata">
        <span class="label">Director</span>
        {movie.director}
      </p>
    {/if}

    {#if movie.cast?.length}
      <p class="metadata">
        <span class="label">Cast</span>
        {movie.cast.join(', ')}
      </p>
    {/if}

    {#if movie.synopsis}
      <p class="synopsis">{movie.synopsis}</p>
    {/if}

    <div class="actions">
      <a class="details-link" href={`/movies/${movie.id}`}>
        View details →
      </a>
    </div>
  </div>
</article>

<style>
  .item {
    display: flex;
    align-items: flex-start;
    gap: 20px;
    width: 100%;
    padding: 18px;
    box-sizing: border-box;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    transition: box-shadow 0.2s ease;
  }

  .item:hover {
    box-shadow: 0 4px 16px rgb(0 0 0 / 7%);
  }

  .artwork {
    flex: 0 0 130px;
  }

  .artwork img {
    display: block;
    width: 100%;
    aspect-ratio: 2 / 3;
    object-fit: cover;
    border-radius: 8px;
    background: #f3f4f6;
  }

  .info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .heading {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 10px;
  }

  .title {
    margin: 0;
    font-size: 22px;
    line-height: 1.3;
    font-weight: 700;
    color: #1f2937;
  }

  .heading a {
    color: inherit;
    text-decoration: none;
  }

  .heading a:hover {
    color: #3659d9;
  }

  .year {
    color: #6b7280;
    font-size: 15px;
  }

  .genres {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .genre {
    padding: 4px 9px;
    border-radius: 999px;
    background: #f3f4f6;
    color: #4b5563;
    font-size: 12px;
  }

  .rating {
    display: flex;
    align-items: center;
    gap: 5px;
    color: #b7791f;
    font-size: 15px;
  }

  .rating-label {
    color: #9ca3af;
    font-size: 12px;
  }

  .metadata {
    margin: 0;
    color: #4b5563;
    font-size: 14px;
    line-height: 1.5;
  }

  .label {
    margin-right: 6px;
    color: #6b7280;
    font-weight: 600;
  }

  .synopsis {
    margin: 0;
    color: #4b5563;
    font-size: 14px;
    line-height: 1.65;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    overflow: hidden;
  }

  .actions {
    margin-top: auto;
    padding-top: 4px;
  }

  .details-link {
    color: #3659d9;
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
  }

  .details-link:hover {
    text-decoration: underline;
  }

  @media (max-width: 600px) {
    .item {
      gap: 14px;
      padding: 12px;
    }

    .artwork {
      flex-basis: 95px;
    }

    .info {
      gap: 8px;
    }

    .title {
      font-size: 17px;
    }

    .synopsis {
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }
  }
</style>

