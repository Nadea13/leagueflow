import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    const supabase = await createClient();
    const { data: tournaments, error } = await supabase
        .from("tournaments")
        .select(`id, name, status`)
        .limit(10);
        
    return NextResponse.json({ tournaments, error });
}
