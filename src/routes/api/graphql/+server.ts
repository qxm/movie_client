import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
    const gateway = (env.GRAPHQL_GATEWAY_URL || 'http://127.0.0.1:8080').replace(/\/$/, '');
    try {
        // This is a server-to-server request. Do not inherit browser Origin or cookies.
        const response = await globalThis.fetch(`${gateway}/graphql`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: await request.text(),
            signal: AbortSignal.timeout(15_000)
        });
        return new Response(response.body, {
            status: response.status,
            headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' }
        });
    } catch (cause) {
        console.error('GraphQL gateway request failed:', gateway, cause);
        const networkError = cause as { cause?: { code?: string }; name?: string };
        const reason = networkError.cause?.code || networkError.name || 'CONNECTION_FAILED';
        error(502, `Cannot connect to GraphQL gateway at ${new URL(gateway).origin} (${reason}). Check that the backend is running.`);
    }
};
