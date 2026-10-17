import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, fetch }) => {
    try {
        const response = await fetch(`${env.GRAPHQL_GATEWAY_URL || 'http://localhost:8080'}/graphql`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: await request.text()
        });
        return new Response(response.body, {
            status: response.status,
            headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' }
        });
    } catch {
        error(502, 'GraphQL gateway is unavailable. Please retry.');
    }
};
