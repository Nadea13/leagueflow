// Zero-dependency Standalone Server Client (Supabase package removed)

import { StandaloneClient } from "./client";

export type { SupabaseClient } from "./client";

export async function createClient(): Promise<StandaloneClient> {
    return new StandaloneClient();
}

export function createAdminClient(): StandaloneClient {
    return new StandaloneClient();
}
