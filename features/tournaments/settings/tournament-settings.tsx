"use client";

import { useSearchParams } from "next/navigation";
import { getPlans } from "@/actions/admin/plans";
import { Plan } from "@/types";
import { useRouter } from "next/navigation";
import { DangerZone } from "./danger-zone";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslations } from "next-intl";
import { Tournament, TournamentTeam } from "@/types/index";

import { Collaborators } from "@/features/tournaments/settings/collaborators";
import { VenueManager } from "@/features/tournaments/settings/venue-manager";
import { RulesConfig } from "@/features/tournaments/settings/rules-config";
import { GeneralInfo } from "./general-info";
import { RegistrationSettings } from "./registration-settings";



export function TournamentSettings({
    tournament,
    hasFixtures,
    teams,
    activeTab = 'general'
}: {
    tournament: Tournament;
    hasFixtures: boolean;
    userPlan?: string;
    teams: TournamentTeam[];
    activeTab?: string;
}) {
    const tournamentId = tournament.id;
    const tBilling = useTranslations("Billing");
    const router = useRouter();

    const isPro = true; // Pro locks removed for all

    const { toast } = useToast();

    // Payment State
    const [showPayment, setShowPayment] = useState(false);
    const [plans, setPlans] = useState<Plan[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isFetchingPlans, setIsFetchingPlans] = useState(false);

    const searchParams = useSearchParams();

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
            {activeTab === 'general' && <GeneralInfo tournament={tournament} />}
            {activeTab === 'registration' && (
                <RegistrationSettings
                    tournament={tournament}
                    onUpgrade={() => router.push(`${window.location.pathname}?tab=settings&action=upgrade`)}
                />
            )}
            {activeTab === 'rules' && <RulesConfig tournamentId={tournamentId} />}
            {activeTab === 'venue' && <VenueManager tournamentId={tournamentId} />}
            {activeTab === 'collaborators' && (
                <Collaborators tournamentId={tournamentId} togglePayment={togglePayment} />
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
