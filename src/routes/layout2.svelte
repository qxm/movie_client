
<script lang="ts">
  import { page } from '$app/state';

  let currentPath = $derived(page.url.pathname);
</script>

<header class="site-header">
  <div class="container">
    <a class="brand" href="/">Movie Manager</a>

    <nav aria-label="Main navigation">
      <a
        href="/"
        class:active={currentPath === '/'}
        aria-current={currentPath === '/' ? 'page' : undefined}
      >
        Movie List
      </a>

      <a
        href="/add"
        class:active={currentPath === '/add'}
        aria-current={currentPath === '/add' ? 'page' : undefined}
      >
        Add Movie
      </a>
    </nav>
  </div>
</header>

<main class="container">
  <slot />
</main>

<style>
  .site-header {
    background: #1f2937;
    color: white;
    box-shadow: 0 2px 6px rgb(0 0 0 / 10%);
  }

  .container {
    width: min(1100px, 100% - 32px);
    margin: 0 auto;
  }

  .site-header .container {
    min-height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
  }

  .brand {
    color: white;
    font-size: 1.25rem;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
  }

  nav {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  nav a {
    color: #d1d5db;
    text-decoration: none;
    padding: 10px 14px;
    border-radius: 6px;
    transition: background 0.2s, color 0.2s;
  }

  nav a:hover {
    background: #374151;
    color: white;
  }

  nav a.active {
    background: #2563eb;
    color: white;
  }

  main.container {
    padding-top: 24px;
    padding-bottom: 40px;
  }

  @media (max-width: 480px) {
    .site-header .container {
      align-items: flex-start;
      flex-direction: column;
      padding-top: 14px;
      padding-bottom: 14px;
      gap: 10px;
    }

    nav {
      width: 100%;
    }

    nav a {
      flex: 1;
      text-align: center;
      padding: 10px 8px;
    }
  }
</style>

