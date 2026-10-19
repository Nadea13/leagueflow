"use client";

import { getPlans } from "@/actions/common/plans";
import { Plan } from "@/types";
import { DangerZone } from "./danger-zone";

import { useState, useEffect } from "react";
import { Tournament, TournamentTeam } from "@/types/index";

import { StaffSettings } from "@/features/tournaments/settings/staff-settings";
import { LocationSettings } from "@/features/tournaments/settings/location-settings";
import { GeneralSettings } from "./general-settings";
import { CategorySettings } from "./category-settings";



export function TournamentSettings({
    tournament,
    activeTab = 'general',
    userPlan,
    activeCategoryId,
    onCategoryUpdated,
    userRole,
    onTabChange
}: {
    tournament: Tournament;
    hasFixtures: boolean;
    userPlan?: string;
    teams: TournamentTeam[];
    activeTab?: string;
    activeCategoryId?: string | null;
    onCategoryUpdated?: () => void;
    userRole?: string | null;
    onTabChange?: (tab: 'general' | 'categories' | 'location' | 'staff' | 'danger') => void;
}) {
    const tournamentId = tournament.id;

    // Payment State
    const [showPayment, setShowPayment] = useState(false);
    const [_plans, setPlans] = useState<Plan[]>([]);
    const [_isFetchingPlans, setIsFetchingPlans] = useState(false);

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
        <div>
            {activeTab === 'general' &&
                <GeneralSettings
                    tournament={tournament}
                    onNavigateDangerZone={() => onTabChange?.('danger')}
                />
            }

            {activeTab === 'categories' &&
                <CategorySettings tournamentId={tournamentId} sport={tournament.sport} onCategoryUpdated={onCategoryUpdated} />
            }

            {activeTab === 'location' &&
                <LocationSettings tournament={tournament} />
            }
            {activeTab === 'staff' && (
                <StaffSettings tournamentId={tournamentId} userPlan={userPlan} togglePayment={togglePayment} />
            )}
            {activeTab === 'danger' && userRole !== 'co_organizer' && userRole !== 'co-organizer' && userRole !== 'staff' && userRole !== 'referee' && (
                <DangerZone
                    tournamentId={tournamentId}
                    tournamentName={tournament.name}
                    activeCategoryId={activeCategoryId}
                    tournamentStatus={tournament.status}
                    tournamentSettings={(tournament as any).settings}
                />
            )}
        </div>
    );
}
