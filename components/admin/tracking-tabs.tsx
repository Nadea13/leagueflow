"use client";

import { useState } from "react";
import { Tab } from "@/components/ui/tab";
import { TrackingDashboard } from "@/components/admin/tracking-dashboard";
import { TrackingAnalytics } from "@/components/admin/tracking-analytics";
import { BarChart3, Users } from "lucide-react";

import { AuditLog } from "@/types";

interface AdminTrackingTabsProps {
    auditLogs: AuditLog[];
}

export function AdminTrackingTabs({ auditLogs }: AdminTrackingTabsProps) {
    const [activeTab, setActiveTab] = useState<"overview" | "journey">("overview");

    return (
        <div className="w-full">
            <Tab
                value={activeTab}
                onChange={(val) => setActiveTab(val as "overview" | "journey")}
                className="mb-6 w-full md:w-max"
                options={[
                    { label: "Overview Analytics", value: "overview", icon: BarChart3 },
                    { label: "Individual Journey", value: "journey", icon: Users }
                ]}
            />
            
            {activeTab === "overview" ? (
                <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <TrackingAnalytics logs={auditLogs} />
                </div>
            ) : (
                <div className="mt-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <TrackingDashboard initialLogs={auditLogs} />
                </div>
            )}
        </div>
    );
}
