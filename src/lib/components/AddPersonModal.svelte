<script lang="ts">
	import { createPerson } from '#lib/api/people';
	import type { Person } from '#lib/types';

	interface Props {
		onClose: () => void;
		onCreated: (person: Person) => void;
	}

	let { onClose, onCreated }: Props = $props();

	let name = $state('');
	let biography = $state('');
	let saving = $state(false);
	let error = $state('');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();

		if (!name.trim() || saving) return;

		saving = true;
		error = '';

		try {
			const person = await createPerson({
				name: name.trim(),
				biography: biography.trim()
			});

			onCreated(person);
			onClose();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create person';
		} finally {
			saving = false;
		}
	}
</script>

<div class="modal-backdrop">
	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
		<div class="modal-header">
			<h2 id="modal-title">Add New Person</h2>

			<button type="button" onclick={onClose} disabled={saving} aria-label="Close"> × </button>
		</div>

		<form onsubmit={handleSubmit}>
			<label for="person-name">Name *</label>
			<input id="person-name" bind:value={name} required maxlength="255" />

			<label for="person-bio">Biography</label>
			<textarea id="person-bio" bind:value={biography} rows="4"></textarea>

			{#if error}
				<p class="error" role="alert">{error}</p>
			{/if}

			<div class="actions">
				<button type="button" onclick={onClose} disabled={saving}> Cancel </button>

				<button type="submit" disabled={saving || !name.trim()}>
					{saving ? 'Creating...' : 'Create Person'}
				</button>
			</div>
		</form>
	</div>
</div>

<style>
	.modal-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		width: min(500px, calc(100vw - 32px));
		max-height: 90vh;
		overflow-y: auto;
		background: white;
		color: #222;
		padding: 24px;
		border-radius: 12px;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	input,
	textarea {
		width: 100%;
		padding: 10px;
		border: 1px solid #ccc;
		border-radius: 6px;
		box-sizing: border-box;
	}

	.actions {
		display: flex;
		justify-content: flex-end;
		gap: 12px;
		margin-top: 16px;
	}

	button {
		padding: 9px 16px;
		cursor: pointer;
	}

	.error {
		color: #c62828;
	}
</style>
