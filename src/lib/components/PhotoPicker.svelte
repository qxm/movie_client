<script lang="ts">
	import { onDestroy } from 'svelte';
	import { uploadImage, validateImage } from '#lib/api/images';

	let {
		photoUrl = $bindable(null),
		uploading = $bindable(false),
		name = 'Person'
	}: {
		photoUrl: string | null;
		uploading?: boolean;
		name?: string;
	} = $props();
	const id = $props.id();
	let fileInput = $state<HTMLInputElement>();
	let preview = $state('');
	let progress = $state(0);
	let error = $state('');
	let failed = $state(false);
	let disposed = false;
	const displayedPhoto = $derived(preview || photoUrl);
	$effect(() => {
		void displayedPhoto;
		failed = false;
	});

	async function selectPhoto(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file || uploading) return;
		error = validateImage(file, 'Photo') ?? '';
		if (error) return;
		preview = URL.createObjectURL(file);
		progress = 0;
		uploading = true;
		try {
			const url = await uploadImage(
				file,
				(value) => {
					if (!disposed) progress = value;
				},
				'Photo'
			);
			if (!disposed) photoUrl = url;
		} catch (cause) {
			if (!disposed)
				error =
					cause instanceof Error
						? cause.message
						: 'Photo upload failed. Please select the image again.';
		} finally {
			if (preview) URL.revokeObjectURL(preview);
			if (!disposed) {
				preview = '';
				uploading = false;
			}
		}
	}

	onDestroy(() => {
		disposed = true;
		if (preview) URL.revokeObjectURL(preview);
	});
</script>

<div class="photo-picker" aria-busy={uploading}>
	<div class="photo-preview">
		{#if displayedPhoto && !failed}
			<img
				src={displayedPhoto}
				alt={`${name || 'Person'} photo preview`}
				onerror={() => (failed = true)}
			/>
		{:else}<span>No photo</span>{/if}
	</div>
	<div class="photo-controls">
		<span class="photo-label">Profile photo <span class="optional">Optional</span></span>
		<input
			bind:this={fileInput}
			{id}
			type="file"
			aria-label="Choose profile photo"
			accept="image/jpeg,image/png,image/webp"
			onchange={selectPhoto}
			disabled={uploading}
			aria-describedby={`${id}-hint`}
		/>
		<div class="photo-actions">
			<button type="button" disabled={uploading} onclick={() => fileInput?.click()}
				>{photoUrl ? 'Change photo' : 'Upload photo'}</button
			>
			{#if photoUrl}<button
					class="remove-photo"
					type="button"
					disabled={uploading}
					onclick={() => {
						photoUrl = null;
						error = '';
					}}>Remove photo</button
				>{/if}
		</div>
		<p id={`${id}-hint`} class="hint">JPEG, PNG or WebP · Up to 5 MB</p>
		{#if uploading}<p class="upload-status" role="status">Uploading photo… {progress}%</p>{/if}
	</div>
	{#if error}<p class="photo-error" role="alert">
			{error} The profile photo has not been changed.
		</p>{/if}
</div>

<style>
	.photo-picker {
		display: flex;
		flex-wrap: wrap;
		gap: 14px;
		align-items: center;
		padding: 14px;
		border: 1px solid #e1e7f0;
		border-radius: 10px;
		background: #f8fafc;
	}
	.photo-preview {
		display: grid;
		place-items: center;
		width: 88px;
		height: 88px;
		flex: 0 0 88px;
		border-radius: 10px;
		overflow: hidden;
		background: #eaf0f8;
		color: #74849b;
		font-size: 12px;
	}
	.photo-preview img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.photo-controls {
		flex: 1;
		min-width: 150px;
	}
	.photo-label {
		display: block;
		font-size: 13px;
		font-weight: 600;
		margin-bottom: 8px;
		color: #334155;
	}
	.optional {
		font-size: 11px;
		font-weight: 400;
		color: #718096;
		margin-left: 5px;
	}
	input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
	}
	.photo-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}
	button {
		border: 1px solid #cbd8ec;
		border-radius: 6px;
		background: white;
		color: #285cbf;
		padding: 7px 10px;
		font: inherit;
		font-size: 12px;
		cursor: pointer;
	}
	button:disabled {
		opacity: 0.6;
		cursor: wait;
	}
	button:focus-visible {
		outline: 3px solid #93b5ff;
		outline-offset: 2px;
	}
	.remove-photo {
		color: #a33f4e;
		border-color: #e8ccd2;
	}
	.hint {
		font-size: 11px;
		color: #718096;
		margin: 8px 0 0;
	}
	.upload-status {
		font-size: 12px;
		color: #285cbf;
		margin: 7px 0 0;
	}
	.photo-error {
		width: 100%;
		color: #b42336;
		font-size: 12px;
		margin: 0;
	}
</style>
