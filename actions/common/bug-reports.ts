"use server"

import { createClient } from "@/lib/supabase/server"
import { ActionResponse } from "@/types"
import { requireAdminAuth } from "@/lib/admin-auth"

export interface BugReport {
    id: string;
    user_id: string | null;
    user_email: string | null;
    message: string;
    status: 'unread' | 'read' | 'resolved';
    created_at: string;
}

export async function submitBugReport(message: string): Promise<ActionResponse<null>> {
    try {
        const supabase = await createClient()

        // Get current user if available
        const { data: userData } = await supabase.auth.getUser()
        const user = userData?.user

        const { error } = await supabase
            .from("bug_reports")
            .insert({
                user_id: user?.id || null,
                user_email: user?.email || null,
                message: message,
                status: 'unread'
            })

        if (error) {
            console.error("Error submitting bug report:", error)
            return {
                success: false,
                error: "Failed to submit report. Please try again later."
            }
        }

        return {
            success: true,
            message: "Report submitted successfully. Thank you for your feedback!"
        }
    } catch (e: unknown) {
        console.error("Unexpected error submitting bug report:", e)
        return {
            success: false,
            error: "An unexpected error occurred."
        }
    }
}

export async function getBugReports(): Promise<ActionResponse<BugReport[]>> {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return { success: false, error: auth.error };

    try {
        const supabase = auth.supabase;

        const { data, error } = await supabase
            .from("bug_reports")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(5000)

        if (error) {
            console.error("Error fetching bug reports:", error)
            return {
                success: false,
                error: "Failed to load reports."
            }
        }

        return {
            success: true,
            data: data || []
        }
    } catch (e: unknown) {
        console.error("Unexpected error fetching bug reports:", e)
        return {
            success: false,
            error: "An unexpected error occurred."
        }
    }
}

export async function markBugReportAsRead(id: string): Promise<ActionResponse<null>> {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return { success: false, error: auth.error };

    try {
        const supabase = auth.supabase;

        const { error } = await supabase
            .from("bug_reports")
            .update({ status: 'read' })
            .eq("id", id)

        if (error) {
            console.error("Error marking bug report as read:", error)
            return {
                success: false,
                error: "Failed to update report status."
            }
        }

        return {
            success: true
        }
    } catch (e: unknown) {
        console.error("Unexpected error updating bug report:", e)
        return {
            success: false,
            error: "An unexpected error occurred."
        }
    }
}

export async function resolveBugReport(id: string): Promise<ActionResponse<null>> {
    const auth = await requireAdminAuth();
    if (!auth.authorized) return { success: false, error: auth.error };

    try {
        const supabase = auth.supabase;

        const { error } = await supabase
            .from("bug_reports")
            .update({ status: 'resolved' })
            .eq("id", id)

        if (error) {
            console.error("Error resolving bug report:", error)
            return {
                success: false,
                error: "Failed to resolve report."
            }
        }

        return {
            success: true
        }
    } catch (e: unknown) {
        console.error("Unexpected error resolving bug report:", e)
        return {
            success: false,
            error: "An unexpected error occurred."
        }
    }
}
