import { env } from '#lib/server/env';

/** Keep public /api/artworks URLs stable while storage is owned by media-service. */
export function mediaServiceUrl(path: string): string {
	const base = (env.MEDIA_SERVICE_URL || 'http://127.0.0.1:8082').replace(/\/+$/, '');
	return `${base}${path}`;
}
