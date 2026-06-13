import { notFound } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { RegistrationForm } from "@/features/registrations/registration-form";
import { getMyTeams } from "@/actions/manager/team";
import { Team } from "@/types";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Calendar,
    DollarSign,
    MapPin,
    Users,
    Clock,
    ArrowUpRight,
    Info,
    ArrowLeft
} from "lucide-react";

interface DashboardRegistrationPageProps {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ category?: string | string[] }>;
}

export default async function DashboardRegistrationPage({ params, searchParams }: DashboardRegistrationPageProps) {
    const { id } = await params;
    const categoryParam = (await searchParams)?.category;
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
        if (!cat) return "Default Category";
        const ageCategoriesData = (Array.isArray(cat.age_categories) ? cat.age_categories[0] : cat.age_categories) as unknown as { category_name: string | null } | null;
        const ageName = ageCategoriesData?.category_name || "General";
        const gender = cat.gender_type === 'open' ? 'Open'
            : cat.gender_type === 'male' ? 'Male'
                : cat.gender_type === 'female' ? 'Female'
                    : 'Mixed';
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
            .is("deleted_at", null)
            .order("created_at", { ascending: true })
        : { data: [] };

    const teamsResult = await getMyTeams();
    const myTeams = (teamsResult.success ? (teamsResult.data as Team[]) : []) || [];

    const sportsData = (Array.isArray(tournament.sports) ? tournament.sports[0] : tournament.sports) as unknown as { sport_name: string | null } | null;
    const sportName = sportsData?.sport_name || "Sport";

    return (
        <div className="space-y-2 md:space-y-4">
            {/* Top Navigation & Action Bar */}
            <div className="flex md:items-start justify-between gap-2 md:gap-4">
                <div className="flex items-center gap-2 md:gap-4">
                    <Button variant="ghost" size="icon" asChild className="h-10 w-10 shrink-0 hover:bg-primary/10 hover:text-primary transition-all">
                        <Link href="/dashboard">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div className="flex flex-col md:flex-row md:items-start lg:items-center gap-2 md:gap-4">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tighter">
                            {tournament.name}
                        </h1>
                        <div className="flex items-center gap-2 md:gap-3">
                            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 transition-colors text-[10px] font-black tracking-wider rounded-full px-2">
                                {sportName}
                            </Badge>
                            <Badge variant={tournament.is_registration_open ? "default" : "outline"} className="text-[10px] font-black tracking-wider rounded-full px-2">
                                {tournament.is_registration_open ? "Registration Open" : "Registration Closed"}
                            </Badge>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-2 md:gap-4">
                {/* Left side (3 Columns): Tournament Registration Form */}
                <div className="lg:col-span-3 order-2 lg:order-1">
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
                    />
                </div>

                {/* Right side (2 Columns): Tournament Info, Registered Teams, details */}
                <div className="lg:col-span-2 space-y-2 md:space-y-4 order-1 lg:order-2">
                    {/* 3. รายละเอียดการแข่งขัน (Tournament Details / Description) */}
                    <Card className="bg-card border rounded-xl py-2 md:py-4 space-y-2 md:space-y-4">
                        <CardHeader className="flex flex-row items-center space-y-0">
                            <CardTitle>
                                รายละเอียดการแข่งขัน
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 md:space-y-4">
                            {tournament.cover_img && (
                                <div className="aspect-[16/9] w-full rounded-lg overflow-hidden border bg-muted">
                                    <Image
                                        src={tournament.cover_img}
                                        alt={tournament.name}
                                        width={640}
                                        height={360}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            )}
                            <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">
                                {tournament.description ? (
                                    <div
                                        className="text-foreground/95 whitespace-pre-line break-words [&_strong]:font-bold [&_b]:font-bold [&_em]:italic [&_i]:italic [&_u]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2 [&_p]:mb-2 [&_a]:text-primary [&_a]:underline [&_h1]:text-2xl [&_h1]:font-black [&_h1]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:my-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:my-2"
                                        dangerouslySetInnerHTML={{ __html: tournament.description }}
                                    />
                                ) : (
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground/75 py-2">
                                        <Info className="h-4 w-4 shrink-0" />
                                        <span>ไม่มีคำอธิบายเพิ่มเติมสำหรับการแข่งขันนี้</span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 1. ข้อมูลการแข่งขัน (Tournament Information) */}
                    <Card className="bg-card border rounded-xl py-2 md:py-4">
                        <CardContent className="space-y-2 md:space-y-4">
                            <div className="grid gap-3 text-sm">
                                <div className="flex items-start gap-1 md:gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <div className="space-y-1">
                                        <p className="font-bold text-xs text-muted-foreground/80 tracking-wider">วันเวลาที่แข่งขัน</p>
                                        <p className="text-foreground">
                                            {new Date(tournament.start_date).toLocaleDateString("th-TH")} - {new Date(tournament.end_date).toLocaleDateString("th-TH")}
                                        </p>
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex items-start gap-1 md:gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <div className="space-y-1">
                                        <p className="font-bold text-xs text-muted-foreground/80 tracking-wider">สถานที่จัดการแข่งขัน</p>
                                        <p className="text-foreground">{tournament.location_name || "ไม่ระบุสถานที่"}</p>
                                        {tournament.google_map_url && (
                                            <a
                                                href={tournament.google_map_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-xs text-primary font-bold hover:underline group"
                                            >
                                                ดูแผนที่ Google Maps
                                                <ArrowUpRight className="h-3 w-3" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                                <Separator />
                                <div className="flex items-start gap-1 md:gap-2">
                                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                                    <div className="space-y-1">
                                        <p className="font-bold text-xs text-muted-foreground/80 tracking-wider">ค่าสมัครเข้าร่วมการแข่งขัน</p>
                                        <p className="text-foreground font-black text-primary">
                                            {Number(registrationFee || 0) === 0 ? "ฟรี (Free)" : `${Number(registrationFee).toLocaleString()} บาท`}
                                        </p>
                                    </div>
                                </div>
                                {tournament.document_deadline && (
                                    <>
                                        <Separator />
                                        <div className="flex items-start gap-1 md:gap-2">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <div className="space-y-1">
                                                <p className="font-bold text-xs text-muted-foreground/80 tracking-wider">วันปิดรับเอกสาร</p>
                                                <p className="text-foreground">
                                                    {new Date(tournament.document_deadline).toLocaleDateString("th-TH")}
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. รายชื่อทีม (Team List) */}
                    <Card className="bg-card border rounded-xl py-2 md:py-4 space-y-2 md:space-y-4">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle>
                                รายชื่อทีมที่สมัคร {categoryName}
                            </CardTitle>
                            <div className="text-xs">
                                จำนวนทีม: {registeredTeams?.length || 0} / {activeCategory?.max_teams || 8}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 md:space-y-4">
                                {registeredTeams && registeredTeams.length > 0 ? (
                                    <div className="grid gap-1 md:gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {registeredTeams.map((reg) => {
                                            const teamObj = (Array.isArray(reg.team) ? reg.team[0] : reg.team) as unknown as { id: string; name: string; logo_img: string | null } | null;
                                            const isApproved = reg.registration_status === "approved";
                                            return (
                                                <div
                                                    key={reg.id}
                                                    className="flex items-center justify-between p-2 rounded-sm border bg-card hover:bg-muted/10 transition-colors"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded-full flex items-center justify-center overflow-hidden border">
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
                                                        <span className="font-bold text-sm text-foreground truncate max-w-[150px]">
                                                            {teamObj?.name || "Unknown Team"}
                                                        </span>
                                                    </div>
                                                    <Badge
                                                        variant={isApproved ? "default" : "outline"}
                                                        className={isApproved ? "bg-primary/5 text-primary hover:bg-primary/5 border-primary/20" : "bg-warning/5 text-warning hover:bg-warning/5 border-warning/20"}
                                                    >
                                                        {isApproved ? "Approved" : "Pending"}
                                                    </Badge>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-2 md:py-4 border-2 border-dashed rounded-lg space-y-1 md:space-y-2">
                                        <Users className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                                        <p className="text-xs text-muted-foreground">ยังไม่มีทีมสมัครในรุ่นนี้</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
