"use server"

import { createClient } from "@/lib/supabase/server"
import { ActionResponse } from "@/types"

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
