import { describe, it, expect, vi, afterEach } from 'vitest';
import { validateArtwork, uploadArtwork } from './artworks';
import { createMovie } from './movies';

afterEach(() => vi.unstubAllGlobals());

describe('poster validation', () => {
    it.each(['image/png', 'image/jpeg'])('accepts %s at the size limit', (type) => {
        expect(validateArtwork({ type, size: 5 * 1024 * 1024 })).toBeNull();
    });
    it.each([0, 5 * 1024 * 1024 + 1])('rejects invalid size %s', (size) => {
        expect(validateArtwork({ type: 'image/png', size })).toMatch(/non-empty/);
    });
    it('rejects unsupported formats', () => {
        expect(validateArtwork({ type: 'image/gif', size: 100 })).toMatch(/JPEG or PNG/);
    });
});

describe('poster upload', () => {
    function mockUpload(status: number, responseText: string, fail?: 'network' | 'timeout') {
        class Xhr {
            status = status;
            responseText = responseText;
            upload: { onprogress?: (event: unknown) => void } = {};
            onload = () => {};
            onerror = () => {};
            ontimeout = () => {};
            open() {}
            send() {
                this.upload.onprogress?.({ lengthComputable: true, loaded: 50, total: 100 });
                if (fail === 'network') this.onerror();
                else if (fail === 'timeout') this.ontimeout();
                else this.onload();
            }
        }
        vi.stubGlobal('XMLHttpRequest', Xhr);
    }
    const poster = () => new File(['poster'], 'poster.png', { type: 'image/png' });
    it('reports progress and returns the uploaded URL', async () => {
        mockUpload(200, JSON.stringify({ url: '/api/artworks/poster.png' }));
        const progress = vi.fn();
        await expect(uploadArtwork(poster(), progress)).resolves.toBe('/api/artworks/poster.png');
        expect(progress).toHaveBeenCalledWith(50);
    });
    it.each([[400, '{}'], [200, '{}'], [200, 'bad json']])('rejects invalid upload response %s %s', async (status, body) => {
        mockUpload(status, body);
        await expect(uploadArtwork(poster(), vi.fn())).rejects.toThrow(/upload/i);
    });
    it.each(['network', 'timeout'] as const)('handles %s failure', async (fail) => {
        mockUpload(0, '', fail);
        await expect(uploadArtwork(poster(), vi.fn())).rejects.toThrow(/upload/i);
    });
});

describe('create movie API', () => {
    it('sends credit input without response-only person fields', async () => {
        const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { createMovie: { id: 'movie-1' } } }) });
        vi.stubGlobal('fetch', fetchMock);
        const input = { title: 'Movie', releaseYear: 0, synopsis: '', artworkUrl: '', credits: [{ personId: 'person-1', role: 'ACTOR' as const, characterName: 'Hero' }] };
        await expect(createMovie(input)).resolves.toEqual({ id: 'movie-1' });
        expect(fetchMock).toHaveBeenCalledWith('/api/graphql', expect.objectContaining({ body: expect.any(String) }));
        expect(JSON.parse(fetchMock.mock.calls[0][1].body).variables).toEqual({ input });
    });
    it('surfaces GraphQL validation errors', async () => {
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ errors: [{ message: 'Person not found' }] }) }));
        await expect(createMovie({ title: 'Movie', releaseYear: 0, synopsis: '', artworkUrl: '', credits: [] })).rejects.toThrow('Person not found');
    });
});
