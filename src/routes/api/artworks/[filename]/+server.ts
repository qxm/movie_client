import { env } from '#lib/server/env';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, fetch }) => {
	if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(params.filename)) error(404, 'Poster not found.');
	try {
		const response = await fetch(
			`${env.MOVIE_SERVICE_URL || 'http://localhost:8081'}/api/artworks/${params.filename}`
		);
		return new Response(response.body, {
			status: response.status,
			headers: {
				'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
				'Cache-Control': response.ok ? 'public, max-age=86400' : 'no-store'
			}
		});
	} catch {
		error(502, 'Movie service is unavailable.');
	}
};
