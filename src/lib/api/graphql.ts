
const GRAPHQL_URL = '/api/graphql';

export async function graphql<T>(
    query: string,
    variables: Record<string, unknown> = {}
): Promise<T> {

    const response = await fetch(GRAPHQL_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            query,
            variables
        })
    });

    if (!response.ok) {
        const body = await response.text();

        throw new Error(
            `GraphQL HTTP ${response.status} ${response.statusText}
URL: ${response.url}
Response: ${body}`
        );
    }

    const result = await response.json();

    if (result.errors?.length) {
        throw new Error(
            result.errors.map(
                (e: { message: string }) => e.message
            ).join('; ')
        );
    }

    if (!result.data) throw new Error('GraphQL returned no data.');
    return result.data as T;
}
