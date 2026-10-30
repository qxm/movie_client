import { page } from 'vitest/browser';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import PhotoPicker from './PhotoPicker.svelte';
import PersonAvatar from './PersonAvatar.svelte';
import AddPersonModal from './AddPersonModal.svelte';

const mocks = vi.hoisted(() => ({ upload: vi.fn(), createPerson: vi.fn() }));
vi.mock('#lib/api/images', async (original) => ({
	...(await original<typeof import('#lib/api/images')>()),
	uploadImage: mocks.upload
}));
vi.mock('#lib/api/people', () => ({ createPerson: mocks.createPerson }));
const pixel =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=';
const file = () => new File(['photo'], 'person.webp', { type: 'image/webp' });
beforeEach(() => {
	mocks.upload.mockReset();
	mocks.createPerson.mockReset();
});

describe('profile photo interaction', () => {
	it('uploads a selected photo and enables removal', async () => {
		mocks.upload.mockResolvedValue(pixel);
		await render(PhotoPicker, { photoUrl: null, name: 'Alice' });
		await page.getByLabelText('Choose profile photo').upload(file());
		await expect.element(page.getByRole('button', { name: 'Change photo' })).toBeEnabled();
		await expect
			.element(page.getByRole('img', { name: 'Alice photo preview' }))
			.toHaveAttribute('src', pixel);
		expect(mocks.upload.mock.calls[0][2]).toBe('Photo');
	});
	it('rejects unsupported files without uploading', async () => {
		await render(PhotoPicker, { photoUrl: null });
		await page
			.getByLabelText('Choose profile photo')
			.upload(new File(['gif'], 'photo.gif', { type: 'image/gif' }));
		await expect
			.element(page.getByRole('alert'))
			.toHaveTextContent('Please select a JPEG, PNG or WebP image.');
		expect(mocks.upload).not.toHaveBeenCalled();
	});
	it('keeps an existing photo after upload failure', async () => {
		mocks.upload.mockRejectedValue(new Error('Photo upload failed.'));
		await render(PhotoPicker, { photoUrl: pixel, name: 'Alice' });
		await page.getByLabelText('Choose profile photo').upload(file());
		await expect
			.element(page.getByRole('alert'))
			.toHaveTextContent('The profile photo has not been changed.');
		await expect
			.element(page.getByRole('img', { name: 'Alice photo preview' }))
			.toHaveAttribute('src', pixel);
	});
	it('removes a draft photo without another upload', async () => {
		await render(PhotoPicker, { photoUrl: pixel });
		await page.getByRole('button', { name: 'Remove photo' }).click();
		await expect.element(page.getByRole('button', { name: 'Upload photo' })).toBeVisible();
		expect(mocks.upload).not.toHaveBeenCalled();
	});
	it('prevents photo changes until an upload finishes', async () => {
		let finish: (url: string) => void = () => {};
		mocks.upload.mockImplementation(
			() =>
				new Promise<string>((resolve) => {
					finish = resolve;
				})
		);
		await render(PhotoPicker, { photoUrl: null });
		await page.getByLabelText('Choose profile photo').upload(file());
		await expect.element(page.getByRole('button', { name: 'Upload photo' })).toBeDisabled();
		await expect.element(page.getByRole('status')).toHaveTextContent('Uploading photo');
		finish(pixel);
		await expect.element(page.getByRole('button', { name: 'Change photo' })).toBeEnabled();
	});
	it('passes an uploaded photo through person creation', async () => {
		mocks.upload.mockResolvedValue(pixel);
		const person = { id: 'p1', name: 'Alice', biography: '', photoUrl: pixel };
		mocks.createPerson.mockResolvedValue(person);
		const created = vi.fn();
		await render(AddPersonModal, { onClose: vi.fn(), onCreated: created });
		await page.getByLabelText('Name *').fill('Alice');
		await page.getByLabelText('Choose profile photo').upload(file());
		await expect.element(page.getByRole('button', { name: 'Change photo' })).toBeEnabled();
		await page.getByRole('button', { name: 'Create Person' }).click();
		await expect.poll(() => created.mock.calls.length).toBe(1);
		expect(mocks.createPerson).toHaveBeenCalledWith({
			name: 'Alice',
			biography: '',
			photoUrl: pixel
		});
		expect(created).toHaveBeenCalledWith(person);
	});
});

describe('person avatar', () => {
	it('shows initials without a photo', async () => {
		await render(PersonAvatar, { name: 'Alice Lee', photoUrl: null });
		await expect.element(page.getByText('AL', { exact: true })).toBeVisible();
	});
	it('falls back to initials when the photo cannot load', async () => {
		await render(PersonAvatar, { name: 'Alice Lee', photoUrl: 'data:image/png;base64,invalid' });
		await expect.element(page.getByText('AL', { exact: true })).toBeVisible();
	});
});
