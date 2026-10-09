import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export default function OrganizerLayout({ children }: { children: React.ReactNode }) {
    return (
        <DashboardShell>
            {children}
        </DashboardShell>
    );
}
