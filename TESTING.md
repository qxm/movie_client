# Frontend tests

Run the Node-based unit suite from the project root in Windows PowerShell:

```powershell
& "C:\Program Files\nodejs\node.exe" node_modules/vitest/vitest.mjs run --project server
```

Run only GraphQL request/proxy tests:

```powershell
& "C:\Program Files\nodejs\node.exe" node_modules/vitest/vitest.mjs run src/lib/api/graphql.spec.ts src/lib/server/graphql-proxy.spec.ts --project server
```

Remove `run` to watch files and rerun on changes. No Spring Boot services, database, browser, or credentials are needed for this suite. All network requests are mocked; no real records are created or deleted.

## Coverage

- `src/lib/api/graphql.spec.ts`: request JSON/variables, HTTP failures, GraphQL errors in HTTP-200 responses, partial data with errors, nullable values, missing/null envelopes, malformed/empty JSON, and network failure without unsafe automatic mutation retries.
- `src/lib/server/graphql-proxy.spec.ts`: server-to-server forwarding without browser Origin/Cookie leakage, configured/default gateway URLs, trailing slashes, upstream HTTP status/body/content type, GraphQL errors, connection refusal, and timeout handling.
- `src/lib/api/movies.spec.ts`: movie list/detail/create/delete calls, missing records, credits/input payloads, and validation failures.
- `src/lib/api/people.spec.ts`: people list/create calls, nullable/empty biographies, unicode input, variables, and validation failures.
- `src/lib/api/artworks.spec.ts`: file validation, upload progress, invalid responses and transport failures. Movie-operation tests have been moved into movies.spec.ts.
- `src/lib/navigation/person.spec.ts`: source-aware return links and safe fallback destinations.
- `src/lib/vitest-examples/greet.spec.ts`: starter function example.

The `server` project means a Node test environment, not the Spring Boot backend. `Welcome.svelte.spec.ts` belongs to the separate browser-component `client` project and is excluded from the Node unit suite.

Actual HTTP/GraphQL/gRPC connectivity, GraphQL schema compatibility, database persistence, browser interaction, and end-to-end flows require separate integration or browser tests. Passing these mocks does not verify a real backend connection.

Additional checks:

```powershell
& "C:\Program Files\nodejs\node.exe" node_modules/svelte-check/bin/svelte-check --tsconfig ./tsconfig.json
& "C:\Program Files\nodejs\node.exe" node_modules/vite/bin/vite.js build
```
