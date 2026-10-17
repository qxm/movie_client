import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { validateArtwork } from '#lib/api/artworks';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
    const body = await request.formData();
    const file = body.get('file');
    if (!(file instanceof File)) error(400, 'Poster file is required.');
    const validationError = validateArtwork(file);
    if (validationError) error(400, validationError);
    const form = new FormData();
    form.append('file', file);
    try {
        const response = await fetch(`${env.MOVIE_SERVICE_URL || 'http://localhost:8081'}/api/artworks`, {
            method: 'POST', body: form
        });
        return new Response(response.body, {
            status: response.status,
            headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' }
        });
    } catch {
        error(502, 'Movie service is unavailable. Please retry.');
    }
};
