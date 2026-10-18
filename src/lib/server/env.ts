import * as privateEnv from '$app/env/private';

/** Runtime server settings may be absent; callers provide local development defaults. */
export const env: Readonly<Record<string, string | undefined>> = privateEnv;
