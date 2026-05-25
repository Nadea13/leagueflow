import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve('.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const firstEquals = trimmed.indexOf('=');
    if (firstEquals === -1) continue;
    const key = trimmed.substring(0, firstEquals).trim();
    let value = trimmed.substring(firstEquals + 1).trim();
    env[key] = value;
}

const adminSupabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await adminSupabase.from("players").select(`
        id,
        display_name,
        master_player:master_id (
            id,
            first_name,
            last_name,
            profile_img
        )
    `).limit(2);

    if (error) {
        console.error("Error with admin client:", error);
    } else {
        console.log("Admin client player data:", JSON.stringify(data, null, 2));
    }
}

run();
