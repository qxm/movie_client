<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { onDestroy, untrack } from 'svelte';
	import { graphql } from '#lib/api/graphql';
	import { personReturnTarget } from '#lib/navigation/person';

	import type { Person, UpdatePersonInput } from '#lib/types';

	const id = $derived(page.params.id);
	const returnTarget = $derived(personReturnTarget(page.url.searchParams.get('returnTo')));
	let person = $state<Person | null>(null);
	let form = $state({ name: '', biography: '' });
	let loading = $state(true);
	let notFound = $state(false);
	let editing = $state(false);
	let saving = $state(false);
	let deleting = $state(false);
	let error = $state('');
	let success = $state('');
	let deleteError = $state('');
	let deleteDialog = $state<HTMLDialogElement>();
	let loadSequence = 0;
	const displayName = $derived(
		editing ? form.name.trim() || 'Unnamed person' : person?.name || 'Person details'
	);
	const initials = $derived(
		displayName
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((part) => part[0])
			.join('')
			.toUpperCase()
	);
	const PERSON_QUERY = `query Person($id: ID!) { person(id: $id) { id name biography } }`;
	const UPDATE_PERSON = `mutation UpdatePerson($id: ID!, $input: UpdatePersonInput!) { updatePerson(id: $id, input: $input) { id name biography } }`;
	const DELETE_PERSON = `mutation DeletePerson($id: ID!) { deletePerson(id: $id) }`;

	function resetForm() {
		if (person) form = { name: person.name, biography: person.biography ?? '' };
	}
	function startEdit() {
		resetForm();
		editing = true;
		error = '';
		success = '';
	}
	function cancelEdit() {
		resetForm();
		editing = false;
		error = '';
	}
	async function loadPerson(personId: string) {
		const sequence = ++loadSequence;
		loading = true;
		person = null;
		notFound = false;
		editing = false;
		error = '';
		success = '';
		deleteDialog?.close();
		try {
			const data = await graphql<{ person: Person | null }>(PERSON_QUERY, { id: personId });
			if (sequence !== loadSequence) return;
			person = data.person;
			notFound = !person;
			if (person) resetForm();
		} catch (e) {
			if (sequence === loadSequence)
				error = e instanceof Error ? e.message : 'Failed to load person.';
		} finally {
			if (sequence === loadSequence) loading = false;
		}
	}
	async function savePerson(event: SubmitEvent) {
		event.preventDefault();
		if (!person || saving) return;
		if (!form.name.trim() || form.name.trim().length > 255) {
			error = 'Name is required and must be 255 characters or fewer.';
			return;
		}
		saving = true;
		error = '';
		success = '';
		try {
			const data = await graphql<{ updatePerson: Person }>(UPDATE_PERSON, {
				id: person.id,
				input: {
					name: form.name.trim(),
					biography: form.biography.trim()
				} satisfies UpdatePersonInput
			});
			person = data.updatePerson;
			resetForm();
			editing = false;
			success = 'Profile updated successfully.';
		} catch (e) {
			error = e instanceof Error ? e.message : 'Update failed. Your changes are still here.';
		} finally {
			saving = false;
		}
	}
	async function deletePerson() {
		if (!person || deleting) return;
		deleting = true;
		deleteError = '';
		try {
			const data = await graphql<{ deletePerson: boolean }>(DELETE_PERSON, { id: person.id });
			if (!data.deletePerson) throw new Error('Person could not be deleted. Please retry.');
			deleteDialog?.close();
			await goto(returnTarget.href);
		} catch (e) {
			deleteError = e instanceof Error ? e.message : 'Delete failed.';
		} finally {
			deleting = false;
		}
	}
	$effect(() => {
		const personId = id;
		if (personId)
			untrack(() => {
				void loadPerson(personId);
			});
	});
	onDestroy(() => {
		loadSequence++;
	});
</script>

<svelte:head><title>{person?.name ?? 'Person details'} | Movie Manager</title></svelte:head>

<div class="person-page">
	<nav class="breadcrumb" aria-label="Breadcrumb">
		<a class="back-link" href={returnTarget.href}>← {returnTarget.label}</a><span aria-hidden="true"
			>/</span
		><span>{editing ? 'Edit profile' : 'Person details'}</span>
	</nav>
	{#if loading}
		<p class="loading-note" role="status">Loading profile…</p>
		<div class="loading-layout" aria-hidden="true">
			<div class="loading-avatar"></div>
			<div class="loading-copy"><span></span><span></span><span></span></div>
		</div>
	{:else if person}
		<div class="profile-grid">
			<aside class="profile-sidebar" aria-label="Profile overview">
				<div class="profile-art" aria-hidden="true">
					<span class="portrait-ring"></span><span class="monogram">{initials}</span><span
						class="portrait-line"
					></span><span class="portrait-caption">THE PEOPLE BEHIND THE STORY</span>
				</div>
				<div class="sidebar-caption">
					<span>PART OF YOUR COLLECTION</span>
					<p>Great stories begin<br />with extraordinary people.</p>
				</div>
			</aside>
			<div class="profile-content">
				<header class="profile-header">
					<p class="eyebrow">{editing ? 'MAKE IT PERSONAL' : 'PERSON PROFILE'}</p>
					<h1>{displayName}<span>.</span></h1>
					<div class="profile-meta">
						<span class="profile-tag">Cast &amp; crew</span><span class="meta-text"
							>The people behind the movies</span
						>{#if editing}<span class="editing-tag">Editing</span>{/if}
					</div>
					{#if !editing}<div class="header-actions">
							<button class="primary-button" type="button" onclick={startEdit}
								>Edit profile <span aria-hidden="true">↗</span></button
							><button
								class="delete-button"
								type="button"
								onclick={() => {
									deleteError = '';
									deleteDialog?.showModal();
								}}>Delete person</button
							>
						</div>{/if}
				</header>
				{#if success}<div class="notice success" role="status">
						<span aria-hidden="true">✓</span>
						{success}
					</div>{/if}
				{#if error}<div class="notice error" role="alert">
						<strong>{editing ? 'Your changes couldn’t be saved.' : 'Something went wrong.'}</strong>
						<p>{error}</p>
					</div>{/if}
				{#if editing}
					<form id="edit-person" onsubmit={savePerson} aria-busy={saving}>
						<fieldset class="panel" disabled={saving}>
							<legend class="sr-only">Edit person</legend>
							<div class="panel-heading">
								<div>
									<h2>Profile information</h2>
									<p>A name, a background, a story to tell.</p>
								</div>
								<span class="optional">* Required</span>
							</div>
							<div class="field">
								<label for="name">Full name <span class="required">*</span></label><input
									id="name"
									bind:value={form.name}
									required
									maxlength="255"
									autocomplete="name"
									aria-describedby="name-hint"
								/>
								<div class="field-hint" id="name-hint">
									<span>Use the name shown in movie credits.</span><span
										>{form.name.length}/255</span
									>
								</div>
							</div>
							<div class="field biography-field">
								<label for="biography">Biography <span class="optional">Optional</span></label
								><textarea
									id="biography"
									bind:value={form.biography}
									rows="9"
									placeholder="Tell us a little about their background, work, and story…"
									aria-describedby="biography-hint"></textarea>
								<p class="hint" id="biography-hint">
									A short introduction is a great place to start. Line breaks are preserved.
								</p>
							</div>
						</fieldset>
						<footer class="save-bar">
							<div role="status">
								<strong>{saving ? 'Saving profile…' : 'Your changes are ready to save'}</strong
								><span
									>{saving ? 'Please wait a moment.' : 'Cancel to keep the current profile.'}</span
								>
							</div>
							<div class="save-actions">
								<button
									class="secondary-button"
									type="button"
									onclick={cancelEdit}
									disabled={saving}>Cancel</button
								><button class="primary-button" type="submit" disabled={saving || !form.name.trim()}
									>{saving ? 'Saving…' : 'Save changes'}</button
								>
							</div>
						</footer>
					</form>
				{:else}
					<section class="panel biography-panel" aria-labelledby="biography-heading">
						<div class="panel-heading">
							<h2 id="biography-heading">Behind the name</h2>
							<span class="optional">Biography</span>
						</div>
						{#if person.biography?.trim()}<p class="biography">{person.biography}</p>{:else}<div
								class="empty-biography"
							>
								<svg
									viewBox="0 0 24 24"
									width="32"
									height="32"
									fill="none"
									stroke="currentColor"
									stroke-width="1.2"
									aria-hidden="true"><path d="M5 3h10l4 4v14H5zM15 3v5h4M8 12h8M8 16h6" /></svg
								>
								<h3>There’s more to this story</h3>
								<p>No biography yet. Add a few words about their background and work.</p>
								<button class="text-button" type="button" onclick={startEdit}
									>Add a biography →</button
								>
							</div>{/if}
					</section>
				{/if}
			</div>
		</div>
		<dialog
			bind:this={deleteDialog}
			class="delete-dialog"
			aria-labelledby="delete-person-title"
			aria-describedby="delete-person-description"
			oncancel={(event) => {
				if (deleting) event.preventDefault();
			}}
		>
			<span class="delete-icon" aria-hidden="true">×</span>
			<h2 id="delete-person-title">Delete this person?</h2>
			<p id="delete-person-description">
				“{person.name}” will be removed. This action cannot be undone.
			</p>
			{#if deleteError}<p class="delete-error" role="alert">{deleteError}</p>{/if}
			<div class="dialog-actions">
				<button
					class="secondary-button"
					type="button"
					disabled={deleting}
					onclick={() => deleteDialog?.close()}>Keep person</button
				><button class="confirm-delete" type="button" disabled={deleting} onclick={deletePerson}
					>{deleting ? 'Deleting…' : 'Delete permanently'}</button
				>
			</div>
		</dialog>
	{:else}
		<section class="state-panel">
			<span class="state-icon" aria-hidden="true">{notFound ? '?' : '!'}</span>
			<h1>{notFound ? 'Person not found' : 'We couldn’t load this profile'}</h1>
			<p>
				{notFound ? 'This person may have been removed.' : 'Check your connection and try again.'}
			</p>
			{#if error}<details>
					<summary>Error details</summary>
					<p>{error}</p>
				</details>{/if}
			<div class="state-actions">
				{#if !notFound}<button
						type="button"
						class="primary-button"
						onclick={() => id && loadPerson(id)}>Try again</button
					>{/if}<a class="secondary-button" href={returnTarget.href}>{returnTarget.label}</a>
			</div>
		</section>
	{/if}
</div>

<style>
	.person-page {
		--ink: #182638;
		--muted: #64748b;
		--line: #e2e8f0;
		--blue: #2563eb;
		color: var(--ink);
		font-family:
			Inter,
			ui-sans-serif,
			system-ui,
			-apple-system,
			sans-serif;
		padding: 4px 0 12px;
	}
	.breadcrumb {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		font-size: 12px;
		line-height: 1.8;
		color: #8b98aa;
		margin-bottom: 32px;
	}
	.back-link {
		color: #61758f;
		text-decoration: none;
	}
	.back-link:hover {
		color: var(--blue);
	}
	.profile-grid {
		display: grid;
		grid-template-columns: 245px minmax(0, 1fr);
		gap: 40px;
		align-items: start;
	}
	.profile-sidebar,
	.profile-content {
		min-width: 0;
	}
	.profile-art {
		position: relative;
		isolation: isolate;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		aspect-ratio: 4 / 5;
		overflow: hidden;
		border: 1px solid #dbe5f4;
		border-radius: 14px;
		background: linear-gradient(145deg, #f3f7fe, #e4edfb);
	}
	.portrait-ring {
		position: absolute;
		width: 175px;
		height: 175px;
		border: 1px solid #cfdcf2;
		border-radius: 50%;
		z-index: -1;
		top: 33px;
	}
	.portrait-ring::after {
		content: '';
		position: absolute;
		width: 215px;
		height: 215px;
		border: 1px solid #dbe5f5;
		border-radius: 50%;
		inset: -21px;
	}
	.monogram {
		width: 125px;
		height: 125px;
		border-radius: 50%;
		background: #f8fbff;
		box-shadow: 0 8px 25px #4b73b812;
		display: grid;
		place-items: center;
		font-size: 40px;
		letter-spacing: -1.5px;
		font-weight: 600;
		color: #5578b3;
		margin: 18px 0 27px;
	}
	.portrait-line {
		width: 26px;
		border-top: 2px solid #6a8fc7;
		margin-bottom: 18px;
	}
	.portrait-caption {
		font-size: 8px;
		color: #6f86aa;
		letter-spacing: 1.2px;
		text-align: center;
		padding: 0 10px;
	}
	.sidebar-caption {
		text-align: center;
		padding: 22px 4px;
	}
	.sidebar-caption > span {
		color: var(--blue);
		font-size: 9px;
		font-weight: 650;
		letter-spacing: 1.4px;
	}
	.sidebar-caption p {
		color: #8493a7;
		font-size: 11px;
		line-height: 1.9;
		margin: 9px 0 0;
	}
	.profile-header {
		padding: 6px 0 28px;
	}
	.eyebrow {
		color: var(--blue);
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.8px;
		margin: 0 0 12px;
	}
	h1 {
		font-size: clamp(28px, 3.6vw, 44px);
		line-height: 1.2;
		margin: 0 0 18px;
		letter-spacing: -1.5px;
		overflow-wrap: anywhere;
	}
	h1 > span {
		color: var(--blue);
	}
	.profile-meta {
		display: flex;
		gap: 12px;
		align-items: center;
		flex-wrap: wrap;
	}
	.profile-tag {
		font-size: 10px;
		color: #56729d;
		padding: 4px 9px;
		background: #f0f5fc;
		border: 1px solid #e2eaf7;
		border-radius: 5px;
	}
	.meta-text {
		font-size: 11px;
		color: #8292a8;
	}
	.editing-tag {
		font-size: 10px;
		color: #8a6323;
		background: #fff6dd;
		padding: 4px 8px;
		border-radius: 5px;
	}
	.header-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
		margin-top: 25px;
	}
	button,
	input,
	textarea {
		font: inherit;
	}
	button {
		cursor: pointer;
	}
	.primary-button,
	.secondary-button,
	.delete-button,
	.confirm-delete {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 20px;
		padding: 12px 18px;
		min-height: 42px;
		box-sizing: border-box;
		border-radius: 8px;
		font-size: 12px;
		font-weight: 650;
		text-decoration: none;
	}
	.primary-button {
		color: white;
		background: var(--blue);
		border: 1px solid var(--blue);
	}
	.primary-button:hover:not(:disabled) {
		background: #1d4ed8;
	}
	.secondary-button {
		color: #536780;
		background: white;
		border: 1px solid var(--line);
	}
	.delete-button {
		color: #ab4052;
		background: white;
		border: 1px solid #edd8de;
	}
	.delete-button:hover {
		background: #fff5f6;
	}
	.panel {
		border: 1px solid var(--line);
		border-radius: 12px;
		background: white;
		padding: 26px;
		margin: 0 0 22px;
		min-width: 0;
	}
	.panel-heading {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 15px;
		margin-bottom: 22px;
	}
	h2 {
		font-size: 17px;
		line-height: 1.5;
		margin: 0;
		letter-spacing: -0.3px;
	}
	.panel-heading p {
		font-size: 11px;
		color: var(--muted);
		margin: 5px 0 0;
		line-height: 1.7;
	}
	.optional {
		font-size: 10px;
		font-weight: 400;
		color: #8090a6;
		white-space: nowrap;
	}
	.biography {
		color: #52647e;
		font-size: 13px;
		line-height: 2;
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		margin: 0;
	}
	.empty-biography {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		border: 1px dashed #d8e2f0;
		background: #fafcfe;
		border-radius: 9px;
		padding: 34px 20px;
	}
	.empty-biography svg {
		color: #8ca2c3;
		margin-bottom: 16px;
	}
	.empty-biography h3 {
		margin: 0 0 8px;
		font-size: 14px;
		font-weight: 600;
		color: #3e536f;
	}
	.empty-biography p {
		margin: 0;
		font-size: 11px;
		line-height: 1.8;
		color: #8191a7;
		max-width: 300px;
	}
	.text-button {
		color: #3264b7;
		background: transparent;
		border: 0;
		padding: 7px 0;
		margin-top: 13px;
		font-size: 11px;
	}
	.notice {
		padding: 14px 16px;
		border-radius: 9px;
		font-size: 12px;
		line-height: 1.7;
		margin-bottom: 20px;
		overflow-wrap: anywhere;
	}
	.notice p {
		margin: 4px 0 0;
	}
	.success {
		color: #27764c;
		background: #f0fbf5;
		border: 1px solid #cfe9dc;
	}
	.success > span {
		margin-right: 6px;
	}
	.error {
		color: #a0394a;
		background: #fff5f6;
		border: 1px solid #f1d3d9;
	}
	fieldset {
		min-width: 0;
	}
	.field {
		display: flex;
		flex-direction: column;
		gap: 9px;
	}
	.field label {
		font-size: 12px;
		font-weight: 650;
		color: #30435f;
	}
	.field label .optional {
		margin-left: 6px;
	}
	.required {
		color: #b34858;
	}
	input,
	textarea {
		box-sizing: border-box;
		width: 100%;
		min-width: 0;
		border: 1px solid #d4dce7;
		border-radius: 7px;
		padding: 12px;
		color: var(--ink);
		font-size: 12px;
		background: white;
	}
	textarea {
		resize: vertical;
		min-height: 190px;
		line-height: 1.8;
	}
	.field-hint {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		font-size: 10px;
		line-height: 1.7;
		color: #7b8ca3;
	}
	.field-hint > span:last-child {
		white-space: nowrap;
	}
	.biography-field {
		margin-top: 24px;
	}
	.hint {
		font-size: 10px;
		line-height: 1.8;
		color: #7b8ca3;
		margin: 0;
	}
	.save-bar {
		position: sticky;
		bottom: 12px;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: white;
		box-shadow: 0 5px 20px #1826380d;
		padding: 16px;
	}
	.save-bar > div:first-child {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.save-bar strong {
		font-size: 11px;
	}
	.save-bar span {
		font-size: 10px;
		line-height: 1.5;
		color: #7b8ba1;
	}
	.save-actions {
		display: flex;
		gap: 9px;
		flex-shrink: 0;
	}
	button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	.delete-dialog {
		width: min(430px, calc(100% - 32px));
		box-sizing: border-box;
		border: 1px solid #e4eaf2;
		border-radius: 16px;
		padding: 28px;
		color: var(--ink);
		box-shadow: 0 20px 70px #18263833;
	}
	.delete-dialog::backdrop {
		background: #18263888;
		backdrop-filter: blur(3px);
	}
	.delete-icon {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		color: #b34456;
		background: #fff0f2;
		border-radius: 12px;
		font-size: 26px;
		margin-bottom: 18px;
	}
	.delete-dialog h2 {
		font-size: 20px;
	}
	.delete-dialog p {
		font-size: 12px;
		line-height: 1.8;
		color: #6e7d92;
		overflow-wrap: anywhere;
	}
	.delete-dialog .delete-error {
		color: #b34456;
	}
	.dialog-actions {
		display: flex;
		justify-content: end;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 24px;
	}
	.confirm-delete {
		color: white;
		border: 1px solid #b83b50;
		background: #b83b50;
	}
	.state-panel {
		display: flex;
		align-items: center;
		flex-direction: column;
		text-align: center;
		border: 1px dashed #d8e1ed;
		border-radius: 12px;
		background: #fafbfd;
		padding: 60px 24px;
	}
	.state-icon {
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		color: #547bb9;
		background: #eaf1ff;
		border-radius: 14px;
		font-size: 24px;
		margin-bottom: 20px;
	}
	.state-panel h1 {
		font-size: 26px;
		letter-spacing: -0.6px;
		margin-bottom: 10px;
	}
	.state-panel p,
	details {
		font-size: 12px;
		line-height: 1.8;
		color: var(--muted);
		overflow-wrap: anywhere;
		max-width: 100%;
	}
	summary {
		cursor: pointer;
	}
	.state-actions {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
		gap: 12px;
		margin-top: 20px;
	}
	.loading-note {
		font-size: 12px;
		color: var(--muted);
	}
	.loading-layout {
		display: grid;
		grid-template-columns: 245px minmax(0, 1fr);
		gap: 40px;
	}
	.loading-avatar {
		aspect-ratio: 4 / 5;
		border-radius: 14px;
		background: #edf2f8;
	}
	.loading-copy {
		padding-top: 20px;
	}
	.loading-copy span {
		display: block;
		height: 14px;
		border-radius: 6px;
		background: #edf2f8;
		margin-bottom: 24px;
	}
	.loading-copy span:first-child {
		width: 65%;
		height: 40px;
	}
	.loading-copy span:last-child {
		height: 150px;
		margin-top: 60px;
	}
	:is(button, a, input, textarea):focus-visible {
		outline: 3px solid #93b5ff;
		outline-offset: 3px;
	}
	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
		border: 0;
	}
	@media (max-width: 900px) {
		.profile-grid {
			grid-template-columns: 205px minmax(0, 1fr);
			gap: 26px;
		}
		.panel {
			padding: 20px;
		}
		.save-bar {
			flex-wrap: wrap;
		}
		.save-actions {
			width: 100%;
		}
		.save-actions .primary-button {
			flex: 1;
		}
	}
	@media (max-width: 650px) {
		.profile-grid {
			grid-template-columns: minmax(0, 1fr);
			gap: 26px;
		}
		.profile-sidebar {
			width: min(230px, 100%);
			margin: 0 auto;
		}
		.sidebar-caption {
			display: none;
		}
		.profile-header {
			padding-top: 0;
		}
		.breadcrumb {
			margin-bottom: 24px;
		}
		.profile-meta {
			gap: 9px;
		}
		.header-actions {
			margin-top: 20px;
		}
		.dialog-actions > button {
			flex: 1;
			padding: 11px 10px;
		}
		.loading-layout {
			grid-template-columns: 100px minmax(0, 1fr);
			gap: 20px;
		}
		.loading-copy span:last-child {
			margin-top: 20px;
		}
	}
</style>
