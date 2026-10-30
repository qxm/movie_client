<script lang="ts">
	let { name, photoUrl }: { name: string; photoUrl?: string | null } = $props();
	let failed = $state(false);
	const initials = $derived(
		name
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0])
			.join('')
			.toUpperCase() || '?'
	);
	$effect(() => {
		void photoUrl;
		failed = false;
	});
</script>

<span class="person-avatar">
	{#if photoUrl && !failed}<img
			src={photoUrl}
			alt=""
			loading="lazy"
			onerror={() => (failed = true)}
		/>{:else}{initials}{/if}
</span>

<style>
	.person-avatar {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		border-radius: inherit;
		overflow: hidden;
	}
	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
