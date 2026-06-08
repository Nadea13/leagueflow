import { notFound } from "next/navigation";
import Image from "next/image";
import { Link } from "@/i18n/routing";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { RegistrationForm } from "@/features/registrations/registration-form";
import { getMyTeams } from "@/actions/manager/team";
import { Team } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EmptyState } from "@/components/shared/empty-state";
import { getTranslations } from "next-intl/server";
import {
    Calendar,
    DollarSign,
    MapPin,
    Users,
    Clock,
    ArrowUpRight,
    Info,
    AlertCircle
} from "lucide-react";

interface RegisterPageProps {
    params: Promise<{ id: string }>;
    searchParams?: Promise<{ category?: string | string[] }>;
}

export default async function RegisterPage({ params, searchParams }: RegisterPageProps) {
    const { id } = await params;
    const categoryParam = (await searchParams)?.category;
    const tournamentCategoryId = typeof categoryParam === "string" ? categoryParam : undefined;
    const t = await getTranslations("Registration");
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    // 1. Fetch tournament details
    const { data: tournament, error } = await supabase
        .from("tournaments")
        .select(`
            id, name, description, status, start_date, end_date,
            is_registration_open, registration_fee, bank_account_number, bank_name, bank_account_name,
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

    // 3. Fetch registered teams (bypass RLS for public view using adminSupabase)
    const { data: registeredTeams } = resolvedCategoryId
        ? await adminSupabase
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
        <div className="min-h-screen bg-background overflow-x-hidden pt-20">
            {/* Navbar */}
            <nav className="border-b fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                        <svg viewBox="0 0 160 160" className="w-8 h-8" xmlns="http://www.w3.org/2000/svg">
                            <path d="M85.4616 21.9501C86.0436 21.9471 86.6256 21.9441 87.2253 21.941C94.6778 21.9214 101.867 22.4122 109.212 23.8001C108.078 25.1269 106.944 26.4529 105.805 27.7751C104.953 28.7693 104.105 29.7682 103.268 30.7751C95.053 40.4796 85.8612 49.0996 75.6116 56.6001C75.0985 56.9801 74.5855 57.3601 74.0569 57.7517C62.719 66.1146 50.7349 73.3682 38.3116 80.0001C37.7382 80.3066 37.1648 80.6131 36.5741 80.9288C32.6149 83.0001 32.6149 83.0001 30.8116 83.0001C30.5549 81.8516 30.3068 80.7011 30.0616 79.5501C29.9223 78.9097 29.7831 78.2693 29.6397 77.6095C28.1595 68.5881 28.3166 59.5618 28.3616 50.4501C28.3656 49.0256 28.3692 47.6012 28.3725 46.1767C28.3812 42.7178 28.395 39.259 28.4116 35.8001C43.3259 28.6069 43.3259 28.6069 49.5616 26.7501C50.1967 26.5597 50.8319 26.3693 51.4864 26.1732C53.3888 25.6225 55.296 25.1029 57.2116 24.6001C58.021 24.3849 58.021 24.3849 58.8467 24.1654C67.5959 21.9748 76.496 21.9759 85.4616 21.9501Z" fill="#0D2C54" />
                            <path d="M143.612 48.5996C144.14 48.5996 144.668 48.5996 145.212 48.5996C145.95 75.4476 143.218 103.372 125.212 124.6C124.536 125.405 123.861 126.21 123.165 127.04C114.98 136.526 99.6453 150.742 86.8117 152.6C84.5742 151.628 84.5742 151.628 82.2117 150.25C81.4238 149.797 80.636 149.344 79.8242 148.878C79.2261 148.522 78.628 148.166 78.0117 147.8C78.0117 145.4 78.0117 145.4 79.3117 144.04C79.9387 143.515 80.5657 142.99 81.2117 142.45C90.2309 134.585 98.7241 126.103 106.012 116.6C106.823 115.571 107.634 114.543 108.446 113.515C123.99 93.7006 135.136 72.2987 143.612 48.5996Z" fill="#0D2C54" />
                            <path d="M128.411 7C128.675 7.528 128.939 8.056 129.211 8.6C128.486 10.2676 128.486 10.2676 127.323 12.3313C126.896 13.091 126.47 13.8508 126.03 14.6336C125.562 15.4475 125.093 16.2614 124.611 17.1C124.136 17.9304 123.661 18.7608 123.172 19.6164C114.766 34.1514 104.746 46.8321 93.2106 59C92.3567 59.9049 92.3567 59.9049 91.4856 60.8281C87.7139 64.7157 83.6366 68.1475 79.3899 71.5047C77.8355 72.739 76.2941 73.9889 74.7512 75.2375C66.616 81.759 58.2439 87.4056 49.2106 92.6C48.3451 93.1068 48.3451 93.1068 47.4621 93.6238C21.8479 108.6 21.8479 108.6 15.6106 108.6C15.3372 107.502 15.0722 106.401 14.8106 105.3C14.5878 104.381 14.5878 104.381 14.3606 103.444C13.9648 101.133 13.988 98.941 14.0106 96.6C14.5443 96.3837 15.078 96.1674 15.6279 95.9445C43.5248 84.5694 70.347 70.2494 92.4106 49.4C93.5065 48.4454 94.6064 47.4952 95.7106 46.55C101.954 41.0825 107.257 35.0974 112.411 28.6C112.769 28.1515 113.128 27.7031 113.497 27.241C118.747 20.6719 123.743 14.0008 128.411 7Z" fill="#00C49A" />
                            <path d="M132.412 16.5996C132.808 17.3916 132.808 17.3916 133.212 18.1996C132.401 20.3205 132.401 20.3205 131.121 23.009C130.893 23.4895 130.665 23.97 130.43 24.465C129.682 26.0307 128.923 27.5906 128.162 29.1496C127.905 29.6788 127.648 30.2079 127.384 30.7531C123.495 38.7442 119.335 46.2689 114.012 53.3996C113.424 54.2174 112.836 55.0352 112.23 55.8777C110.469 58.29 108.658 60.6516 106.812 62.9996C106.212 63.7638 105.613 64.5279 104.996 65.3152C94.7698 77.8603 83.0952 89.4632 70.0115 98.9996C68.8962 99.869 68.8962 99.869 67.7584 100.756C57 109.105 45.5483 116.434 33.2115 122.2C32.4195 118.24 31.6275 114.28 30.8115 110.2C31.7139 109.743 32.6162 109.286 33.5459 108.815C61.9532 94.2572 89.802 74.4553 109.729 49.166C110.957 47.616 112.202 46.0805 113.446 44.5434C119.624 36.8337 125.049 28.9151 130 20.3654C130.761 19.084 131.585 17.8399 132.412 16.5996Z" fill="#00C49A" />
                            <path d="M137.211 24.5986C138.191 27.5371 137.739 28.1896 136.565 30.983C136.234 31.7759 135.904 32.5688 135.563 33.3857C135.2 34.2315 134.836 35.0773 134.461 35.9486C133.908 37.2513 133.908 37.2513 133.343 38.5803C119.694 70.3639 98.4172 99.4369 70.8115 120.599C69.8872 121.334 68.9644 122.072 68.0427 122.811C53.7988 134.199 53.7988 134.199 50.8115 134.199C50.2508 132.803 49.7033 131.402 49.1615 129.999C48.8552 129.219 48.5489 128.439 48.2334 127.636C47.3033 124.29 47.3033 124.29 48.4115 122.199C50.0305 120.986 51.5772 119.968 53.3115 118.949C72.4474 107.16 90.9969 91.6468 105.002 74.0486C106.187 72.5746 107.402 71.1232 108.646 69.6986C120.381 56.2213 129.292 40.5486 137.211 24.5986Z" fill="#00C49A" />
                        </svg>
                        <span className="font-black text-foreground text-xl tracking-tighter">League Flow</span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground hidden md:block">{t("nav_team_registration")}</span>
                    </div>
                </div>
            </nav>

            <main className="container mx-auto pb-4 max-w-7xl">
                {!tournament.is_registration_open ? (
                    <EmptyState
                        title={t("registration_closed_title")}
                        description={t("registration_closed_desc")}
                        icon={AlertCircle}
                        action={
                            <p className="text-sm font-bold text-primary/60 tracking-widest">{t("contact_organizer")}</p>
                        }
                    />
                ) : (
                    <div className="space-y-4">
                        {/* Title & Badges */}
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

                        {/* Grid Layout: 5 Columns on Desktop */}
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                            {/* Left side (3 Columns): Tournament Registration Form */}
                            <div className="lg:col-span-3">
                                <RegistrationForm
                                    tournament={{
                                        id: tournament.id,
                                        name: tournament.name,
                                        registration_fee: Number(tournament.registration_fee || 0),
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
                            <div className="lg:col-span-2 space-y-4">
                                {/* 1. ข้อมูลการแข่งขัน (Tournament Information) */}
                                <Card className="border rounded-xl py-2 md:py-4">
                                    <CardContent className="space-y-2 md:space-y-4">
                                        <div className="grid gap-3 text-sm">
                                            <div className="flex items-start gap-1 md:gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <div className="space-y-1">
                                                    <p className="font-bold text-xs text-muted-foreground/80 tracking-wider">วันเวลาที่แข่งขัน</p>
                                                    <p className="text-foreground">
                                                        {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString("th-TH") : "-"} - {tournament.end_date ? new Date(tournament.end_date).toLocaleDateString("th-TH") : "-"}
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
                                                        {Number(tournament.registration_fee || 0) === 0 ? "ฟรี (Free)" : `${Number(tournament.registration_fee).toLocaleString()} บาท`}
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
                                <Card className="border rounded-xl py-2 md:py-4 space-y-2 md:space-y-4">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                                        <CardTitle className="text-sm font-semibold">
                                            รายชื่อทีมที่สมัคร {categoryName}
                                        </CardTitle>
                                        <div className="text-xs text-muted-foreground">
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
                                                                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-9 w-9 rounded-full bg-muted/20 flex items-center justify-center overflow-hidden border">
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

                                {/* 3. รายละเอียดการแข่งขัน (Tournament Details / Description) */}
                                <Card className="border rounded-xl py-2 md:py-4 space-y-2 md:space-y-4">
                                    <CardHeader className="flex flex-row items-center space-y-0">
                                        <CardTitle className="text-sm font-semibold">
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
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
