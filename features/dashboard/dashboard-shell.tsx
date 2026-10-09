"use client";

import { useEffect, useState } from "react";
import { ApiClient } from "@/lib/api-client";
import { DashboardSidebar } from "@/features/dashboard/dashboard-sidebar";
import { DashboardNavbar } from "@/features/dashboard/dashboard-navbar";

interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    role: string;
    avatar_url?: string;
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const token = ApiClient.getToken();
                if (!token) {
                    setIsLoading(false);
                    return;
                }

                const profile = await ApiClient.fetch<UserProfile>('/auth/me');
                setUser(profile);
            } catch (err) {
                console.error("Failed to fetch user profile:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    const userRole = user?.role || 'organizer';
    const isOrganizer = user?.role === 'organizer' || user?.role === 'super_admin';
    const isTeamManager = true;
    const userName = user?.full_name || (isLoading ? "กำลังโหลด..." : "ผู้ใช้งาน");
    const userEmail = user?.email || "";
    const userAvatar = user?.avatar_url;

    return (
        <div className="min-h-screen w-full md:grid md:grid-cols-[64px_1fr]">
            <div className="border-r bg-muted/40 hidden md:block">
                <div className="flex h-full min-h-screen flex-col gap-2">
                    <DashboardSidebar
                        role={userRole}
                        isOrganizer={isOrganizer}
                        isTeamManager={isTeamManager}
                        forcedMode="organizer"
                        userEmail={userEmail}
                        userName={userName}
                        userAvatar={userAvatar}
                    />
                </div>
            </div>
            <div className="flex flex-col min-w-0 min-h-screen">
                <DashboardNavbar
                    userEmail={userEmail}
                    userName={userName}
                    userAvatar={userAvatar}
                    role={userRole}
                    isOrganizer={isOrganizer}
                    isTeamManager={isTeamManager}
                    forcedMode="organizer"
                    className="md:hidden"
                />
                <main className="flex-1 p-2 md:p-4 pb-17 md:pb-4">
                    {children}
                </main>
            </div>
        </div>
    );
}
