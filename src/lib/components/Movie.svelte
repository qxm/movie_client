
<script lang="ts">
  interface MovieCredit {
    personId: string;
    person: { id: string; name: string } | null;
    role: string;
    characterName?: string | null;
  }

  interface Movie {
    id: string;
    title: string;
    releaseYear: number;
    synopsis: string;
    artworkUrl: string;
    credits: MovieCredit[];
  }

  let { movie }: { movie: Movie } = $props();

  const directors = $derived(movie.credits?.filter(c => c.role === 'DIRECTOR' && c.person?.name) ?? []);
  const actors = $derived(movie.credits?.filter(c => c.role === 'ACTOR' && c.person?.name) ?? []);
  const writers = $derived(movie.credits?.filter(c => c.role === 'WRITER' && c.person?.name) ?? []);
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
      <a href={`/movies/${movie.id}`}>
        <h2 class="title">{movie.title}</h2>
      </a>

      {#if movie.releaseYear}
        <span class="year">{movie.releaseYear}</span>
      {/if}
    </div>

    {#if directors.length || actors.length || writers.length}
      <div class="credits-line">
        {#if directors.length}
          <span class="credit-group"><strong>Director:</strong> {directors.map(c => c.person?.name).join(', ')}</span>
        {/if}
        {#if actors.length}
          <span class="credit-group"><strong>Actors:</strong> {actors.map(c => c.person?.name).join(', ')}</span>
        {/if}
        {#if writers.length}
          <span class="credit-group"><strong>Writer:</strong> {writers.map(c => c.person?.name).join(', ')}</span>
        {/if}
      </div>
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

  .credits-line {
    display: flex;
    flex-wrap: wrap;
    column-gap: 18px;
    row-gap: 4px;
    color: #4b5563;
    font-size: 14px;
    line-height: 1.5;
  }

  .credit-group strong {
    color: #6b7280;
    font-weight: 600;
    margin-right: 4px;
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

