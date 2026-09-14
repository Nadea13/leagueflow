import { notFound } from "next/navigation";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { RegistrationForm } from "@/features/registrations/registration-form";
import { RegistrationTourButton } from "@/features/registrations/registration-tour-button";
import { getMyTeams } from "@/actions/manager/team";
import { Team } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Calendar,
    DollarSign,
    MapPin,
    Users,
    Clock,
    ArrowUpRight,
    ArrowLeft,
    FileText
} from "lucide-react";
import { Header } from "@/components/ui/header";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import { 
    DocumentSubmissionClient, 
    TournamentDetails, 
    UserRegisteredTeam 
} from "@/features/registrations/document-submission-client";

interface DashboardRegistrationPageProps {
    params: Promise<{ id: string; locale: string }>;
    searchParams?: Promise<{ category?: string | string[]; tab?: string; team?: string }>;
}

export default async function DashboardRegistrationPage({ params, searchParams }: DashboardRegistrationPageProps) {
    const { id, locale } = await params;
    const t = await getTranslations({ locale, namespace: "Registration" });
    const resolvedSearchParams = await searchParams;
    const categoryParam = resolvedSearchParams?.category;
    const activeTab = resolvedSearchParams?.tab === "documents" ? "documents" : "registration";
    const initialTeamId = resolvedSearchParams?.team;
    const tournamentCategoryId = typeof categoryParam === "string" ? categoryParam : undefined;
    const supabase = await createClient();

    // 1. Fetch tournament details
    const { data: tournament, error } = await supabase
        .from("tournaments")
        .select(`
            id, name, description, status, start_date, end_date,
            is_registration_open, bank_account_number, bank_name, bank_account_name,
            location_name, google_map_url, document_deadline, logo_img, cover_img,
            sports:sport_id(sport_name)
        `)
        .eq("id", id)
        .is("deleted_at", null)
        .single();

    if (error || !tournament) {
        notFound();
    }

    // 2. Fetch categories
    const { data: categories } = await supabase
        .from("tournament_categories")
        .select(`
            id,
            gender_type,
            max_teams,
            registration_fee,
            age_categories (
                category_name
            )
        `)
        .eq("tournament_id", id)
        .is("deleted_at", null);

    const activeCategory = tournamentCategoryId
        ? categories?.find(c => String(c.id) === tournamentCategoryId)
        : categories?.[0];

    const resolvedCategoryId = activeCategory?.id;
    const registrationFee = activeCategory?.registration_fee ?? 0;

    type CategoryItem = NonNullable<typeof categories>[number];

    const getCategoryDisplayName = (cat: CategoryItem | null | undefined) => {
        if (!cat) return t("default_category");
        const ageCategoriesData = (Array.isArray(cat.age_categories) ? cat.age_categories[0] : cat.age_categories) as unknown as { category_name: string | null } | null;
        const ageName = ageCategoriesData?.category_name || t("general");
        const gender = cat.gender_type === 'open' ? t("gender_open")
            : cat.gender_type === 'male' ? t("gender_male")
                : cat.gender_type === 'female' ? t("gender_female")
                    : t("gender_mixed");
        return `${ageName} (${gender})`;
    };

    const categoryName = getCategoryDisplayName(activeCategory);

    // 3. Fetch registered teams
    const { data: registeredTeams } = resolvedCategoryId
        ? await supabase
            .from("tournament_teams")
            .select(`
                id,
                registration_status,
                payment_status,
                team:teams (
                    id,
                    name,
                    logo_img
                )
            `)
            .eq("tournament_category_id", resolvedCategoryId)
            .neq("registration_status", "rejected")
            .is("deleted_at", null)
            .order("created_at", { ascending: true })
        : { data: [] };

    const teamsResult = await getMyTeams();
    const myTeams = (teamsResult.success ? (teamsResult.data as Team[]) : []) || [];
    const myTeamIds = myTeams.map((t) => t.id);

    // Fetch user's registered teams in this tournament for document submission
    const { data: rawUserTeams } = await supabase
        .from("tournament_teams")
        .select(`
            id,
            contact_name,
            contact_phone,
            team:teams (
                id,
                name,
                logo_img
            ),
            tournament_categories!inner (
                id,
                tournament_id,
                gender_type,
                age_categories (
                    category_name
                )
            )
        `)
        .eq("tournament_categories.tournament_id", id)
        .in(
            "team_id",
            myTeamIds.length > 0 ? myTeamIds : ["00000000-0000-0000-0000-000000000000"]
        )
        .is("deleted_at", null);

    const userRegisteredTeams: UserRegisteredTeam[] = (rawUserTeams || []).map((item) => {
        const teamData = Array.isArray(item.team) ? item.team[0] : item.team;
        const catData = Array.isArray(item.tournament_categories)
            ? item.tournament_categories[0]
            : item.tournament_categories;
        const ageCatData = (
            catData && Array.isArray(catData.age_categories)
                ? catData.age_categories[0]
                : catData?.age_categories || null
        ) as { category_name: string | null } | null;

        return {
            id: item.id,
            contact_name: item.contact_name,
            contact_phone: item.contact_phone,
            team: teamData
                ? {
                      id: teamData.id,
                      name: teamData.name,
                      logo_img: teamData.logo_img
                  }
                : null,
            tournament_categories: catData
                ? {
                      id: catData.id,
                      gender_type: catData.gender_type,
                      age_categories: ageCatData
                          ? {
                                category_name: ageCatData.category_name
                            }
                          : null
                  }
                : null
        };
    });

    const sportsData = (Array.isArray(tournament.sports) ? tournament.sports[0] : tournament.sports) as unknown as { sport_name: string | null } | null;
    const sportName = sportsData?.sport_name || "Sport";

    const tournamentDetails: TournamentDetails = {
        id: tournament.id,
        name: tournament.name,
        description: tournament.description,
        status: tournament.status || "draft",
        start_date: tournament.start_date,
        end_date: tournament.end_date,
        document_deadline: tournament.document_deadline,
        location_name: tournament.location_name,
        cover_img: tournament.cover_img,
        logo_img: tournament.logo_img,
        sport_name: sportName,
        is_registration_open: tournament.is_registration_open || false
    };

    const isFull = (registeredTeams?.length || 0) >= (activeCategory?.max_teams || 8);
    const isPastDeadline = tournament.document_deadline ? new Date(tournament.document_deadline) < new Date() : false;
    const isRegistrationDisabled = isFull || isPastDeadline || !tournament.is_registration_open;

    // Check if tournament has meaningful text description (strips HTML tags and entities left by rich text editor)
    const strippedDescription = (tournament.description || "")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .trim();
    const hasDescription = strippedDescription.length > 0;

    return (
        <div className="relative min-h-[calc(100vh-5rem)] -m-2 md:-m-4 p-2 md:p-4 space-y-2 md:space-y-4">
            {/* Full-page Background Cover with Light Tint & Blur */}
            {tournament.cover_img && (
                <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
                    <Image
                        src={tournament.cover_img}
                        alt={tournament.name}
                        fill
                        priority
                        className="object-cover object-center"
                    />
                    {/* Light dark/light mode overlay that keeps the cover image vibrant and clearly visible */}
                    <div className="absolute inset-0 bg-background/50 dark:bg-background/65 backdrop-blur-[2px]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background/30" />
                </div>
            )}

            {/* Content Wrapper */}
            <div className="relative z-10 space-y-2 md:space-y-4">
                {/* Top Navigation & Action Bar */}
                <div className="flex md:items-start justify-between gap-2 md:gap-4">
                    <div className="flex items-center gap-1 md:gap-2">
                        <Button variant="ghost" size="icon" asChild className="h-10 w-10 shrink-0 hover:bg-primary/10 hover:text-primary transition-all">
                            <Link href="/dashboard">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <div className="flex md:items-start lg:items-center gap-1 md:gap-2" id="tour-registration-header">
                            <Header level={2}>
                                <span className="md:hidden">
                                    {tournament.name && tournament.name.length > 16
                                        ? `${tournament.name.substring(0, 16)}...`
                                        : tournament.name}
                                </span>
                                <span className="hidden md:inline">
                                    {tournament.name}
                                </span>
                            </Header>
                            <Badge variant="outline" className={tournament.cover_img ? "bg-card/50 backdrop-blur-md border-border/60" : ""}>
                                {sportName}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <RegistrationTourButton />
                        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-sm border">
                            <Button
                                variant={activeTab === "registration" ? "default" : "ghost"}
                                size="sm"
                                asChild
                                className="h-8 text-xs font-bold gap-1.5"
                            >
                                <Link href={`/dashboard/registrations/${tournament.id}?tab=registration${tournamentCategoryId ? `&category=${tournamentCategoryId}` : ""}`}>
                                    <span>ลงทะเบียน</span>
                                </Link>
                            </Button>
                            <Button
                                variant={activeTab === "documents" ? "default" : "ghost"}
                                size="sm"
                                asChild
                                className="h-8 text-xs font-bold gap-1.5"
                            >
                                <Link href={`/dashboard/registrations/${tournament.id}?tab=documents${initialTeamId ? `&team=${initialTeamId}` : ""}`}>
                                    <FileText className="h-3.5 w-3.5" />
                                    <span>ส่งเอกสาร</span>
                                    {userRegisteredTeams.length > 0 && (
                                        <Badge variant="outline" className="px-1 py-0 text-[10px] h-4">
                                            {userRegisteredTeams.length}
                                        </Badge>
                                    )}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>

                {activeTab === "documents" ? (
                    <div className="pt-2">
                        <DocumentSubmissionClient
                            tournament={tournamentDetails}
                            registeredTeams={userRegisteredTeams}
                            locale={locale}
                            initialTeamId={initialTeamId}
                            hideHeader={true}
                        />
                    </div>
                ) : (
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 md:gap-4">
                    {/* Left side (3 Columns): Tournament Info, Registered Teams, details */}
                    <div className="lg:col-span-3 space-y-2 md:space-y-4 order-1">
                        {/* 3. รายละเอียดการแข่งขัน (Tournament Details / Description & Cover) */}
                        {(tournament.cover_img || hasDescription) && (
                            <Card 
                                className={cn(
                                    "border rounded-sm overflow-hidden",
                                    hasDescription ? "" : "",
                                    tournament.cover_img ? "bg-card/50 backdrop-blur-xl shadow-lg" : "bg-card"
                                )}
                                id="tour-registration-details"
                            >
                                {tournament.cover_img && (
                                    <div className="relative w-full aspect-[2/1] overflow-hidden">
                                        <Image
                                            src={tournament.cover_img}
                                            alt={tournament.name}
                                            fill
                                            priority
                                            className="object-cover object-center"
                                        />
                                    </div>
                                )}
                                {hasDescription && (
                                    <>
                                        <CardHeader className={cn("flex flex-row items-center space-y-0", tournament.cover_img ? "pt-2 md:pt-4" : "pt-4")}>
                                            <CardTitle>{t("details")}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-2 md:space-y-4 px-2 lg:px-4">
                                            <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
                                                <div
                                                    className="text-foreground/95 whitespace-pre-line break-words [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_p]:mb-2 [&_a]:text-primary [&_a]:underline [&_h1]:text-2xl [&_h1]:font-black [&_h1]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:my-2"
                                                    dangerouslySetInnerHTML={{ __html: tournament.description! }}
                                                />
                                            </div>
                                        </CardContent>
                                    </>
                                )}
                            </Card>
                        )}

                        {/* 1. ข้อมูลการแข่งขัน (Tournament Information) */}
                        <Card 
                            className={cn(
                                "border rounded-sm overflow-hidden",
                                tournament.cover_img ? "bg-card/50 backdrop-blur-xl shadow-lg" : "bg-card"
                            )}
                            id="tour-registration-info"
                        >
                            <CardContent className="">
                                <div className="grid text-sm divide-y divide-border">
                                    <div className="flex items-start gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-4">
                                        <Calendar className="h-9 w-9 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="space-y-1">
                                            <p className="font-bold text-xs text-muted-foreground/80 tracking-wider">{t("dates")}</p>
                                            <p className="text-foreground">
                                                {tournament.start_date ? formatDate(tournament.start_date, "d MMMM yyyy", locale) : "-"} - {tournament.end_date ? formatDate(tournament.end_date, "d MMMM yyyy", locale) : "-"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-3">
                                        <MapPin className="h-9 w-9 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="space-y-1">
                                            <p className="font-bold text-xs text-muted-foreground/80 tracking-wider">{t("location")}</p>
                                            <p className="text-foreground">{tournament.location_name || t("no_location")}</p>
                                            {tournament.google_map_url && (
                                                <a
                                                    href={tournament.google_map_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline group"
                                                >
                                                    {t("view_map")}
                                                    <ArrowUpRight className="h-3 w-3" />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-3">
                                        <DollarSign className="h-9 w-9 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="space-y-1">
                                            <p className="font-bold text-xs text-muted-foreground/80 tracking-wider">{t("registration_fee")}</p>
                                            <p className="text-foreground font-black text-primary">
                                                {Number(registrationFee || 0) === 0 ? t("free") : `${Number(registrationFee).toLocaleString()} ${locale === "th" ? "บาท" : "THB"}`}
                                            </p>
                                        </div>
                                    </div>
                                    {tournament.document_deadline && (
                                        <div className="flex items-start gap-1 md:gap-2 px-2 md:px-4 py-2 md:py-3">
                                            <Clock className="h-9 w-9 text-muted-foreground mt-0.5 shrink-0" />
                                            <div className="space-y-1">
                                                <p className="font-bold text-xs text-muted-foreground/80 tracking-wider">{t("deadline")}</p>
                                                <p className="text-foreground">
                                                    {formatDate(tournament.document_deadline, "d MMMM yyyy", locale)}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* 2. รายชื่อทีม (Team List) */}
                        <Card 
                            className={cn(
                                "border rounded-sm overflow-hidden py-0 space-y-0",
                                tournament.cover_img ? "bg-card/50 backdrop-blur-xl shadow-lg" : "bg-card"
                            )}
                            id="tour-registration-teams"
                        >
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-border py-3 px-3 md:px-4">
                                <CardTitle>
                                    {t("registered_list", { category: categoryName })}
                                </CardTitle>
                                <div className="text-xs text-muted-foreground font-medium">
                                    {t("teams_count", { current: registeredTeams?.length || 0, max: activeCategory?.max_teams || 8 })}
                                </div>
                            </CardHeader>
                            <CardContent className="px-0 py-0">
                                <div>
                                    {registeredTeams && registeredTeams.length > 0 ? (
                                        <div className="divide-y divide-border max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {registeredTeams.map((reg) => {
                                                const teamObj = (Array.isArray(reg.team) ? reg.team[0] : reg.team) as unknown as { id: string; name: string; logo_img: string | null } | null;
                                                return (
                                                    <div
                                                        key={reg.id}
                                                        className={cn(
                                                            "flex items-center justify-between px-3 md:px-4 py-2.5 transition-colors",
                                                            tournament.cover_img 
                                                                ? "hover:bg-card/80" 
                                                                : "hover:bg-muted/20"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden border shrink-0">
                                                                {teamObj?.logo_img ? (
                                                                    <Image
                                                                        src={teamObj.logo_img}
                                                                        alt={teamObj.name}
                                                                        width={36}
                                                                        height={36}
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <Users className="h-4 w-4 text-muted-foreground/65" />
                                                                )}
                                                            </div>
                                                            <span className="font-bold text-sm text-foreground truncate max-w-[180px]">
                                                                {teamObj?.name || "Unknown Team"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <EmptyState
                                            icon={Users}
                                            description={t("no_teams_registered_category")}
                                            className="min-h-[160px]"
                                        />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right side (2 Columns): Tournament Registration Form */}
                    <div className="lg:col-span-2 order-2 space-y-4">
                        <RegistrationForm
                            tournament={{
                                id: tournament.id,
                                name: tournament.name,
                                registration_fee: Number(registrationFee || 0),
                                bank_account_number: tournament.bank_account_number || "",
                                bank_name: tournament.bank_name || "",
                                bank_account_name: tournament.bank_account_name || "",
                                is_registration_open: tournament.is_registration_open || false,
                                status: tournament.status || "draft"
                            }}
                            tournamentCategoryId={resolvedCategoryId ? String(resolvedCategoryId) : undefined}
                            initialTeams={myTeams}
                            categories={categories || []}
                            isFull={isFull}
                            isPastDeadline={isPastDeadline}
                            isRegistrationDisabled={isRegistrationDisabled}
                            className={tournament.cover_img ? "bg-card/75 backdrop-blur-xl border-border/60 shadow-lg" : ""}
                        />
                    </div>
                </div>
                )}
            </div>
        </div>
    );
}
