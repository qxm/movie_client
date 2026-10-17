
<script lang="ts">
  interface Movie {
    id: string;
    title: string;
    artworkUrl: string;
    detailUrl?: string;
  }

  let { movie }: { movie: Movie } = $props();
</script>

<div class="item">
  <div class="artwork">
    <img
      src={movie.artworkUrl}
      alt={`${movie.title} artwork`}
      loading="lazy"
    />
  </div>

  <div class="info">
    <div class="hd">
      <a href={movie.detailUrl ?? `/movies/${movie.id}`}>
        <span class="title">{movie.title}</span>
      </a>
    </div>
  </div>
</div>

<style>
  .item {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 16px;
    width: 100%;
    padding: 12px;
    box-sizing: border-box;
  }

  .artwork {
    flex-shrink: 0;
  }

  .artwork img {
    display: block;
    max-height: 200px;
    max-width: 140px;
    object-fit: contain;
    border-radius: 6px;
  }

  .info {
    min-width: 0;
  }

  .title {
    font-size: 18px;
    font-weight: 600;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }
</style>

