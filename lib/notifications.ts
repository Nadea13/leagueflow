import { createClient } from "@/lib/supabase/server";

export async function createNotification(
    userId: string,
    type: 'invite' | 'payment' | 'system',
    title: string,
    message: string,
    link?: string | null
) {
    try {
        const supabase = await createClient();

        await supabase.from('notifications').insert({
            user_id: userId,
            type,
            title,
            message,
            link,
            is_read: false
        });

    } catch (error) {
        console.error("Failed to create notification:", error);
    }
}

export async function markNotificationAsRead(notificationId: string) {
    const supabase = await createClient();
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
}

export async function markAllNotificationsAsRead(userId: string) {
    const supabase = await createClient();
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
}
