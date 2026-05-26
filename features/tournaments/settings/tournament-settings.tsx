"use client";

import { getPlans } from "@/actions/admin/plans";
import { Plan } from "@/types";
import { useRouter } from "next/navigation";
import { DangerZone } from "./danger-zone";

import { useState, useEffect } from "react";
import { Tournament, TournamentTeam } from "@/types/index";

import { StaffSettings } from "@/features/tournaments/settings/staff-settings";
import { LocationSettings } from "@/features/tournaments/settings/location-settings";
import { GeneralSettings } from "./general-settings";
import { RegistrationSettings } from "./registration-settings";



export function TournamentSettings({
    tournament,
    hasFixtures,
    activeTab = 'general'
}: {
    tournament: Tournament;
    hasFixtures: boolean;
    userPlan?: string;
    teams: TournamentTeam[];
    activeTab?: string;
}) {
    const tournamentId = tournament.id;
    const router = useRouter();

    // Payment State
    const [showPayment, setShowPayment] = useState(false);
    const [_plans, setPlans] = useState<Plan[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isFetchingPlans, setIsFetchingPlans] = useState(false);

    // Fetch plans on mount if not provided
    useEffect(() => {
        const fetchPlans = async () => {
            setIsFetchingPlans(true);
            try {
                const res = await getPlans({ role: 'organizer' });
                if (res.success && res.data) {
                    setPlans(res.data as Plan[]);
                }
            } finally {
                setIsFetchingPlans(false);
            }
        };
        fetchPlans();
    }, []);

    const togglePayment = () => {
        setShowPayment(!showPayment);
    };

    return (
        <div className="space-y-6">
            {activeTab === 'general' &&
                <GeneralSettings tournament={tournament} />
            }
            {activeTab === 'registration' && (
                <RegistrationSettings
                    tournament={tournament}
                    onUpgrade={() => router.push(`${window.location.pathname}?tab=settings&action=upgrade`)}
                />
            )}
            {activeTab === 'location' &&
                <LocationSettings tournament={tournament} />
            }
            {activeTab === 'staff' && (
                <StaffSettings tournamentId={tournamentId} togglePayment={togglePayment} />
            )}
            {activeTab === 'danger' && (
                <DangerZone
                    tournamentId={tournamentId}
                    tournamentName={tournament.name}
                    hasFixtures={hasFixtures}
                />
            )}
        </div>
    );
}
