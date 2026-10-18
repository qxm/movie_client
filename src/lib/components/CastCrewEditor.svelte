<script lang="ts">
	import AddPersonModal from '#lib/components/AddPersonModal.svelte';
	import { graphql } from '#lib/api/graphql';

	import type {
		CreditRole as Role,
		EditableCredit as Credit,
		PersonSummary as PersonOption
	} from '#lib/types';

	let {
		credits = $bindable(),
		mockMode = false
	}: {
		credits: Credit[];
		mockMode?: boolean;
	} = $props();

	let keyword = $state('');
	let selectedPersonId = $state('');
	let selectedRole = $state<Role>('ACTOR');
	let characterName = $state('');
	let showAddPerson = $state(false);
	let error = $state('');

	const SEARCH_PEOPLE = `
    query SearchPeople($keyword: String!) {
      searchPeople(keyword: $keyword) {
        id
        name
      }
    }
  `;

	let searchResults = $state<PersonOption[]>([]);
	let newlyCreatedPeople = $state<PersonOption[]>([]);
	let visiblePeople = $derived.by(() => {
		const query = keyword.trim().toLowerCase();
		const local = newlyCreatedPeople.filter((person) => person.name.toLowerCase().includes(query));
		return [
			...local,
			...searchResults.filter((person) => !local.some((created) => created.id === person.id))
		];
	});
	let searching = $state(false);
	let searchError = $state('');
	let selectedPerson = $state<PersonOption | null>(null);
	let searchSequence = 0;

	// Debounce requests and ignore stale responses.
	$effect(() => {
		const query = keyword.trim();
		const sequence = ++searchSequence;

		if (selectedPerson || !query) {
			searching = false;
			searchResults = [];
			searchError = '';
			return;
		}

		searching = true;
		searchError = '';
		searchResults = [];

		const timer = setTimeout(async () => {
			try {
				const data = await graphql<{ searchPeople: PersonOption[] }>(SEARCH_PEOPLE, {
					keyword: query
				});
				if (sequence !== searchSequence) return;
				searchResults = data.searchPeople ?? [];
			} catch (e) {
				if (sequence !== searchSequence) return;
				searchError = e instanceof Error ? e.message : 'Search failed.';
			} finally {
				if (sequence === searchSequence) searching = false;
			}
		}, 300);

		return () => {
			clearTimeout(timer);
			searchSequence++;
		};
	});

	function onKeywordInput() {
		selectedPerson = null;
		selectedPersonId = '';
	}

	function creditExists(credit: Credit): boolean {
		return credits.some(
			(existing) =>
				existing.personId === credit.personId &&
				existing.role === credit.role &&
				(existing.characterName ?? '') === (credit.characterName ?? '')
		);
	}

	function addCredit(credit: Credit) {
		if (creditExists(credit)) {
			error = 'This credit has already been added.';
			return false;
		}

		credits = [...credits, credit];
		error = '';
		return true;
	}

	function addExistingPerson() {
		if (!selectedPerson) {
			error = 'Please select a person.';
			return;
		}

		const added = addCredit({
			personId: selectedPerson.id,
			name: selectedPerson.name,
			role: selectedRole,
			characterName: selectedRole === 'ACTOR' ? characterName.trim() || null : null
		});

		if (added) {
			keyword = '';
			selectedPerson = null;
			selectedPersonId = '';
			selectedRole = 'ACTOR';
			characterName = '';
		}
	}

	function handlePersonCreated(person: { id: string; name: string }) {
		// Creating a Person does not automatically create a Movie Credit.
		// Show the new Person in Search Person so the user can choose a role.
		newlyCreatedPeople = [
			person,
			...newlyCreatedPeople.filter((existing) => existing.id !== person.id)
		];
		selectedPerson = null;
		selectedPersonId = '';
		selectedRole = 'ACTOR';
		characterName = '';
		keyword = person.name;
		searchResults = [];
		searchError = '';
		error = '';
		showAddPerson = false;
	}

	function removeCredit(index: number) {
		credits = credits.filter((_, i) => i !== index);
		error = '';
	}
</script>

<section class="cast-crew-editor">
	<div class="section-header">
		<div>
			<h2>Cast & Crew</h2>
			<p>Add or remove cast and crew members.</p>
		</div>

		<button type="button" class="primary-btn" onclick={() => (showAddPerson = true)}>
			+ Add New Person
		</button>
	</div>

	{#if error}
		<div class="error" role="alert">{error}</div>
	{/if}

	<!-- Existing Credits -->
	<div class="selected-credits">
		<h3>Selected People ({credits.length})</h3>

		{#if credits.length === 0}
			<p class="empty">No cast or crew added yet.</p>
		{:else}
			<div class="credits-list">
				{#each credits as credit, index (index)}
					<div class="credit-item">
						<div class="credit-info">
							<strong>{credit.name}</strong>

							<span>
								{credit.role}
								{#if credit.characterName}
									· {credit.characterName}
								{/if}
							</span>
						</div>

						<button type="button" class="remove-btn" onclick={() => removeCredit(index)}>
							Remove
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Search Existing People -->
	<div class="person-search">
		<h3>Add Existing Person</h3>

		<div class="field">
			<label for="credit-person-search">Search Person</label>

			<input
				id="credit-person-search"
				type="search"
				bind:value={keyword}
				placeholder="Search actors, directors..."
				oninput={onKeywordInput}
			/>
		</div>

		{#if keyword.trim() && !selectedPersonId}
			<div class="search-results">
				{#if searching && visiblePeople.length === 0}
					<p role="status">Searching...</p>
				{:else if searchError && visiblePeople.length === 0}
					<p class="search-error" role="alert">{searchError}</p>
				{:else}
					{#each visiblePeople as person (person.id)}
						<button
							type="button"
							onclick={() => {
								selectedPersonId = person.id;
								selectedPerson = person;
								keyword = person.name;
							}}
						>
							{person.name}
						</button>
					{:else}
						<p>No matching people found.</p>
					{/each}
				{/if}
			</div>
		{/if}

		{#if selectedPerson}
			<p class="selected-person">
				Selected: <strong>{selectedPerson.name}</strong>
			</p>

			<div class="role-fields">
				<div class="field">
					<label for="credit-role">Role</label>

					<select id="credit-role" bind:value={selectedRole}>
						<option value="ACTOR">Actor</option>
						<option value="DIRECTOR">Director</option>
						<option value="WRITER">Writer</option>
						<option value="PRODUCER">Producer</option>
					</select>
				</div>

				{#if selectedRole === 'ACTOR'}
					<div class="field">
						<label for="credit-character">Character Name</label>

						<input id="credit-character" bind:value={characterName} placeholder="Character name" />
					</div>
				{/if}
			</div>

			<button type="button" class="outline-btn" onclick={addExistingPerson}>
				+ Add to Movie
			</button>
		{/if}
	</div>
</section>

{#if showAddPerson}
	<AddPersonModal onClose={() => (showAddPerson = false)} onCreated={handlePersonCreated} />
{/if}

<style>
	.cast-crew-editor {
		margin-top: 24px;
	}

	.section-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 24px;
	}

	h2 {
		margin: 0 0 6px;
		font-size: 1.3rem;
	}

	h3 {
		margin: 0 0 16px;
		font-size: 1.05rem;
	}

	.section-header p {
		margin: 0;
		color: #6b7280;
		font-size: 0.9rem;
	}

	.primary-btn,
	.outline-btn {
		padding: 10px 16px;
		border-radius: 7px;
		cursor: pointer;
		font-weight: 600;
	}

	.primary-btn {
		background: #2563eb;
		color: white;
		border: none;
		white-space: nowrap;
	}

	.outline-btn {
		background: white;
		color: #2563eb;
		border: 1px solid #2563eb;
	}

	.selected-credits {
		margin-bottom: 28px;
	}

	.credits-list {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.credit-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 16px;
		padding: 15px;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		background: white;
	}

	.credit-info {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.credit-info span {
		color: #6b7280;
		font-size: 0.9rem;
	}

	.remove-btn {
		background: white;
		color: #dc2626;
		border: 1px solid #fecaca;
		border-radius: 6px;
		padding: 8px 12px;
		cursor: pointer;
	}

	.person-search {
		background: #f9fafb;
		border-radius: 10px;
		padding: 20px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 16px;
	}

	label {
		font-size: 0.9rem;
		font-weight: 600;
	}

	input,
	select {
		width: 100%;
		box-sizing: border-box;
		padding: 11px 12px;
		border: 1px solid #d1d5db;
		border-radius: 7px;
		background: white;
		font: inherit;
	}

	.search-results {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 7px;
		max-height: 200px;
		overflow-y: auto;
		margin-bottom: 16px;
	}

	.search-results button {
		display: block;
		width: 100%;
		text-align: left;
		background: white;
		border: none;
		border-bottom: 1px solid #f3f4f6;
		padding: 12px;
		cursor: pointer;
	}

	.search-results button:hover {
		background: #eff6ff;
	}

	.search-results p {
		padding: 12px;
		color: #6b7280;
	}

	.search-error {
		color: #b91c1c !important;
	}

	.selected-person {
		color: #374151;
	}

	.role-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.empty {
		padding: 18px;
		background: #f9fafb;
		border-radius: 8px;
		color: #6b7280;
	}

	.error {
		padding: 12px;
		margin-bottom: 16px;
		border-radius: 7px;
		background: #fef2f2;
		color: #b91c1c;
	}

	@media (max-width: 600px) {
		.section-header {
			flex-direction: column;
		}

		.role-fields {
			grid-template-columns: 1fr;
		}
	}
</style>
