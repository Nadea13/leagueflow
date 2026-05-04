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

import { Collaborators } from "@/components/tournaments/settings/collaborators";
import { VenueManager } from "@/components/tournaments/settings/venue-manager";
import { RulesConfig } from "@/components/tournaments/settings/rules-config";
import { GeneralInfo } from "./general-info";



export function TournamentSettings({ tournament, hasFixtures, teams }: { tournament: Tournament; hasFixtures: boolean; userPlan?: string; teams: TournamentTeam[] }) {
    const tournamentId = tournament.id;
    const t = useTranslations("Settings");
    const tBilling = useTranslations("Billing");
    const tCommon = useTranslations("Common");
    const tDialog = useTranslations("Dialog");
    const tTournament = useTranslations("Tournament");
    const router = useRouter();

    const isPro = true; // Pro locks removed for all

    const { toast } = useToast();

    // Payment State
    const [showPayment, setShowPayment] = useState(false);
    const [plans, setPlans] = useState<Plan[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isFetchingPlans, setIsFetchingPlans] = useState(false);
    const [mounted, setMounted] = useState(false);



    const searchParams = useSearchParams();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (searchParams.get("action") === "upgrade" && !isPro && !showPayment) {
            setShowPayment(true);
        }
    }, [searchParams, isPro, showPayment]);


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

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const tournamentPlan = plans.find(p =>
        p.name?.trim() === 'Per Tournament' ||
        p.duration?.toLowerCase().includes('tournament')
    );

    const togglePayment = () => {
        setShowPayment(!showPayment);
    };


    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const handlePaymentSuccess = () => {
        setShowPayment(false);
        router.refresh();
        toast({ title: tBilling("payment_success"), description: tBilling("payment_success_desc") });
    };





    return (
        <div className="space-y-2 md:space-y-6">
            <GeneralInfo tournament={tournament} />

            {/* Rules and Venue Section */}
            <RulesConfig tournamentId={tournamentId} />

            <VenueManager tournamentId={tournamentId} />

            {/* Collaborators */}
            <Collaborators tournamentId={tournamentId} togglePayment={togglePayment} />

            {/* Billing & Subscription */}
            {/* Temporarily hidden during development */}
            {/*
            <div className="space-y-4 md:space-y-6">
                ... (billing section hidden)
            </div>
            */}

            {/* Danger Zone */}
            <DangerZone 
                tournamentId={tournamentId} 
                tournamentName={tournament.name} 
                hasFixtures={hasFixtures} 
            />
        </div>
    );
}
