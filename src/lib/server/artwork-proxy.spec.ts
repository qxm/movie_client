import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const settings = vi.hoisted(() => ({}) as Record<string, string | undefined>);
vi.mock('#lib/server/env', () => ({ env: settings }));
import { POST } from '../../routes/api/artworks/+server';
import { GET } from '../../routes/api/artworks/[filename]/+server';

let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>;
const filename = '550e8400-e29b-41d4-a716-446655440000.webp';
beforeEach(() => {
	for (const key of Object.keys(settings)) delete settings[key];
	settings.MEDIA_SERVICE_URL = 'http://media.test:8082/';
	fetchMock = vi.fn<typeof fetch>();
});
afterEach(() => vi.restoreAllMocks());

function upload(file: File | null = new File(['poster'], 'poster.webp', { type: 'image/webp' })) {
	const form = new FormData();
	if (file) form.append('file', file);
	return POST({
		request: new Request('http://localhost/api/artworks', { method: 'POST', body: form }),
		fetch: fetchMock
	} as unknown as Parameters<typeof POST>[0]);
}
function download(name = filename) {
	return GET({ params: { filename: name }, fetch: fetchMock } as unknown as Parameters<
		typeof GET
	>[0]);
}

describe('media-service artwork proxy', () => {
	it('sends multipart WebP to media-service and preserves the public URL', async () => {
		fetchMock.mockResolvedValue(
			new Response(JSON.stringify({ url: `/api/artworks/${filename}` }), {
				headers: { 'Content-Type': 'application/json' }
			})
		);
		const response = await upload();
		expect(await response.json()).toEqual({ url: `/api/artworks/${filename}` });
		const [url, options] = fetchMock.mock.calls[0];
		expect(url).toBe('http://media.test:8082/api/artworks');
		expect(options?.method).toBe('POST');
		const file = (options?.body as FormData).get('file') as File;
		expect(file.type).toBe('image/webp');
		expect(await file.text()).toBe('poster');
	});

	it('keeps existing artwork paths and image content type for downloads', async () => {
		fetchMock.mockResolvedValue(
			new Response('image bytes', { headers: { 'Content-Type': 'image/webp' } })
		);
		const response = await download();
		expect(fetchMock.mock.calls[0][0]).toBe(`http://media.test:8082/api/artworks/${filename}`);
		expect(response.headers.get('Content-Type')).toBe('image/webp');
		expect(response.headers.get('Cache-Control')).toBe('public, max-age=86400');
		expect(await response.text()).toBe('image bytes');
	});

	it('uses the new default instead of the old movie-service setting', async () => {
		delete settings.MEDIA_SERVICE_URL;
		settings.MOVIE_SERVICE_URL = 'http://old-movie.test:8081';
		fetchMock.mockResolvedValue(new Response('{}'));
		await upload();
		expect(fetchMock.mock.calls[0][0]).toBe('http://127.0.0.1:8082/api/artworks');
	});

	it('rejects a missing file before calling media-service', async () => {
		await expect(upload(null)).rejects.toMatchObject({ status: 400 });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects unsupported files before calling media-service', async () => {
		await expect(
			upload(new File(['gif'], 'poster.gif', { type: 'image/gif' }))
		).rejects.toMatchObject({ status: 400 });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects invalid download filenames before calling media-service', async () => {
		await expect(download('../secret')).rejects.toMatchObject({ status: 404 });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('preserves upstream upload errors', async () => {
		fetchMock.mockResolvedValue(new Response('too large', { status: 413 }));
		const response = await upload();
		expect(response.status).toBe(413);
		expect(await response.text()).toBe('too large');
	});

	it('does not cache missing images', async () => {
		fetchMock.mockResolvedValue(new Response('missing', { status: 404 }));
		const response = await download();
		expect(response.status).toBe(404);
		expect(response.headers.get('Cache-Control')).toBe('no-store');
	});

	it('reports unavailable media-service on uploads and downloads', async () => {
		fetchMock.mockRejectedValue(new Error('connection refused'));
		await expect(upload()).rejects.toMatchObject({
			status: 502,
			body: { message: 'Media service is unavailable. Please retry.' }
		});
		await expect(download()).rejects.toMatchObject({
			status: 502,
			body: { message: 'Media service is unavailable.' }
		});
	});
});
