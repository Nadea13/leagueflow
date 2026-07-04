const { createClient } = require('@supabase/supabase-js');

const url = 'http://127.0.0.1:55321';
const key = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH';
const supabase = createClient(url, key);

async function run() {
    const { data, error } = await supabase
        .from("match_events")
        .select(`
            *,
            players (display_name)
        `)
        .eq("event_type", "penalty_shot")
        .limit(5);

    if (error) {
        console.error("Query Error:", error);
    } else {
        console.log("Query Data:", JSON.stringify(data, null, 2));
    }
}

run();
