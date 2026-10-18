<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';
	import { personReturnTarget } from '#lib/navigation/person';
	let { children }: { children: Snippet } = $props();
	const currentPath = $derived(page.url.pathname);
	const activeSection = $derived.by(() => {
		if (currentPath === '/search') return 'search';
		if (currentPath === '/add') return 'add';
		if (currentPath.startsWith('/people/')) {
			return personReturnTarget(page.url.searchParams.get('returnTo')).href.startsWith('/search')
				? 'search'
				: 'movies';
		}
		return 'movies';
	});
</script>

<a class="skip-link" href="#main-content">Skip to content</a>
<header class="site-header">
	<div class="container header-inner">
		<a class="brand" href="/" aria-label="Movie Manager home"
			><span class="brand-mark" aria-hidden="true"
				><svg
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					><rect x="3" y="3" width="18" height="18" rx="3" /><path
						d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"
					/></svg
				></span
			><span>Movie Manager<span class="brand-dot">.</span></span></a
		>
		<nav aria-label="Main navigation">
			<a
				href="/"
				class:active={activeSection === 'movies'}
				aria-current={activeSection === 'movies'
					? currentPath === '/'
						? 'page'
						: 'location'
					: undefined}
				><svg
					width="16"
					height="16"
					viewBox="0 0 20 20"
					fill="none"
					stroke="currentColor"
					stroke-width="1.4"
					aria-hidden="true"
					><rect x="3" y="3" width="14" height="14" rx="2" /><path d="M7 3v14M3 7h4M3 13h4" /></svg
				>Movies</a
			>
			<a
				href="/search"
				class:active={activeSection === 'search'}
				aria-current={activeSection === 'search'
					? currentPath === '/search'
						? 'page'
						: 'location'
					: undefined}
				><svg
					width="16"
					height="16"
					viewBox="0 0 20 20"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg
				>Search</a
			>
		</nav>
		<a class="add-movie" href="/add" aria-current={activeSection === 'add' ? 'page' : undefined}
			><span aria-hidden="true">＋</span> Add movie</a
		>
	</div>
</header>

<main class="container" id="main-content" tabindex="-1">{@render children()}</main>

<style>
	:global(body) {
		margin: 0;
		font-family:
			Inter,
			ui-sans-serif,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			sans-serif;
		color: #182638;
		background: white;
	}
	.site-header {
		border-bottom: 1px solid #e7edf5;
		background: white;
	}
	.container {
		width: min(1100px, calc(100% - 40px));
		margin: 0 auto;
	}
	.header-inner {
		min-height: 76px;
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto auto;
		align-items: center;
		gap: 24px;
	}
	.brand {
		display: inline-flex;
		align-items: center;
		justify-self: start;
		gap: 10px;
		color: #182638;
		text-decoration: none;
		font-size: 17px;
		font-weight: 750;
		letter-spacing: -0.55px;
		white-space: nowrap;
	}
	.brand-mark {
		display: grid;
		place-items: center;
		width: 33px;
		height: 33px;
		border-radius: 9px;
		background: #2563eb;
		color: white;
		flex-shrink: 0;
	}
	.brand-dot {
		color: #2563eb;
	}
	nav {
		display: flex;
		align-items: center;
		gap: 6px;
	}
	nav a {
		display: inline-flex;
		justify-content: center;
		align-items: center;
		gap: 8px;
		color: #7a8aa1;
		font-size: 12px;
		font-weight: 550;
		text-decoration: none;
		padding: 11px 14px;
		border-radius: 7px;
		white-space: nowrap;
	}
	nav a:hover {
		background: #f6f8fc;
		color: #375d99;
	}
	nav a.active {
		color: #285bb6;
		background: #eff5ff;
		font-weight: 650;
	}
	.add-movie {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 7px;
		padding: 10px 14px;
		min-height: 40px;
		box-sizing: border-box;
		color: #46699f;
		border: 1px solid #d9e3f2;
		border-radius: 7px;
		font-size: 11px;
		font-weight: 650;
		text-decoration: none;
		white-space: nowrap;
	}
	.add-movie:hover {
		color: #2455a8;
		background: #f5f8fe;
		border-color: #b7ccee;
	}
	.add-movie[aria-current='page'] {
		color: #2455a8;
		border-color: #afc6ef;
		background: #eff5ff;
	}
	.add-movie > span {
		font-size: 17px;
		line-height: 1;
		font-weight: 400;
	}
	main.container {
		padding-top: 28px;
		padding-bottom: 40px;
		outline: none;
	}
	a:focus-visible {
		outline: 3px solid #93b5ff;
		outline-offset: 3px;
	}
	.skip-link {
		position: fixed;
		top: -70px;
		left: 16px;
		padding: 12px 18px;
		border-radius: 8px;
		background: #182638;
		color: white;
		font-size: 13px;
		z-index: 2000;
		text-decoration: none;
	}
	.skip-link:focus {
		top: 12px;
	}
	@media (max-width: 600px) {
		.container {
			width: calc(100% - 32px);
		}
		.header-inner {
			grid-template-columns: minmax(0, 1fr) auto;
			gap: 12px;
			padding: 16px 0 10px;
		}
		.brand {
			font-size: 16px;
			gap: 8px;
		}
		.brand-mark {
			width: 30px;
			height: 30px;
			border-radius: 8px;
		}
		.add-movie {
			grid-column: 2;
			grid-row: 1;
			font-size: 10px;
			padding: 9px 10px;
			min-height: 36px;
		}
		nav {
			grid-row: 2;
			grid-column: 1 / -1;
			gap: 8px;
		}
		nav a {
			flex: 1;
			padding: 11px 10px;
			font-size: 12px;
			min-height: 20px;
		}
		main.container {
			padding-top: 22px;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		* {
			scroll-behavior: auto;
		}
	}
</style>
