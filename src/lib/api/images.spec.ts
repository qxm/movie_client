import { afterEach, describe, expect, it, vi } from 'vitest';
import { uploadImage, validateImage } from './images';

afterEach(() => vi.unstubAllGlobals());

describe('shared photo upload', () => {
	it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts a %s profile photo', (type) => {
		expect(validateImage({ type, size: 5 * 1024 * 1024 }, 'Photo')).toBeNull();
	});
	it('reports photo-specific size validation', () => {
		expect(validateImage({ type: 'image/png', size: 0 }, 'Photo')).toMatch(/^Photo must/);
		expect(validateImage({ type: 'image/png', size: 5 * 1024 * 1024 + 1 }, 'Photo')).toMatch(
			/5 MB/
		);
	});
	it('reuses the artwork endpoint for person photos', async () => {
		let sent: FormData | undefined;
		class Xhr {
			status = 200;
			responseText = JSON.stringify({ url: '/api/artworks/photo.webp' });
			upload: { onprogress?: (event: unknown) => void } = {};
			onload = () => {};
			open = vi.fn((method: string, url: string) => {
				expect(method).toBe('POST');
				expect(url).toBe('/api/artworks');
			});
			send(body: FormData) {
				sent = body;
				this.onload();
			}
		}
		vi.stubGlobal('XMLHttpRequest', Xhr);
		const file = new File(['photo'], 'photo.webp', { type: 'image/webp' });
		await expect(uploadImage(file, vi.fn(), 'Photo')).resolves.toBe('/api/artworks/photo.webp');
		expect(sent?.get('file')).toBe(file);
	});
	it('reports photo upload failures instead of poster messages', async () => {
		class Xhr {
			status = 502;
			upload = {};
			onload = () => {};
			open() {}
			send() {
				this.onload();
			}
		}
		vi.stubGlobal('XMLHttpRequest', Xhr);
		await expect(
			uploadImage(new File(['photo'], 'photo.png', { type: 'image/png' }), vi.fn(), 'Photo')
		).rejects.toThrow('Photo upload failed (502)');
	});
});
