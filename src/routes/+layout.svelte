
<script lang="ts">
  import { page } from '$app/state';

  let currentPath = $derived(page.url.pathname);

  const navigation = [
    { label: 'Movie List', href: '/' },
    { label: 'Add Movie', href: '/add' },
    { label: 'Search Movie', href: '/search' }
  ];
</script>

<header class="site-header">
  <div class="container">
    <a class="brand" href="/">Movie Manager</a>

    <nav aria-label="Main navigation">
      {#each navigation as link}
        <a
          href={link.href}
          class:active={currentPath === link.href}
          aria-current={currentPath === link.href ? 'page' : undefined}
        >
          {link.label}
        </a>
      {/each}
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
  }

  .container {
    width: min(1100px, calc(100% - 32px));
    margin: 0 auto;
  }

  .site-header .container {
    min-height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }

  .brand {
    color: white;
    font-size: 1.25rem;
    font-weight: 700;
    text-decoration: none;
  }

  nav {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  nav a {
    color: #d1d5db;
    text-decoration: none;
    padding: 10px 14px;
    border-radius: 6px;
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

  @media (max-width: 600px) {
    .site-header .container {
      flex-direction: column;
      align-items: flex-start;
      padding: 14px 0;
    }

    nav {
      width: 100%;
    }

    nav a {
      flex: 1;
      text-align: center;
      padding: 10px 8px;
      font-size: 0.9rem;
    }
  }
</style>

