"use client";

import { useState, useTransition } from "react";
import { createMasterPlayer } from "@/actions/common/user";
import { Link } from "@/i18n/routing";
import {
    Trophy, User, Calendar, Phone, Search,
    AlertCircle, Loader2, UserCheck, UserPlus, Activity, Edit
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { Tournament } from "@/types";
import { EditVerifyProfileDialog } from "@/features/teams/edit-verify-profile-dialog";

export interface MasterPlayer {
    id: string;
    first_name: string;
    last_name: string;
    gender?: 'male' | 'female' | string | null;
    birthday?: string | null;
    tel?: string | null;
    profile_img?: string | null;
    verified?: boolean;
    status?: string;
}

interface DashboardClientProps {
    initialTournaments: Partial<Tournament>[];
    initialMasterPlayer: MasterPlayer | null;
}

export function DashboardClient({ initialTournaments, initialMasterPlayer }: DashboardClientProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [masterPlayer, setMasterPlayer] = useState(initialMasterPlayer);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Form inputs state
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [gender, setGender] = useState("male");
    const [birthday, setBirthday] = useState("");
    const [tel, setTel] = useState("");

    // Edit profile state
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleOpenEdit = () => {
        setIsEditDialogOpen(true);
    };

    // Filter tournaments based on search query
    const filteredTournaments = initialTournaments.filter(t =>
        t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);

        if (!firstName || !lastName || !gender || !birthday) {
            setError("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน");
            return;
        }

        const formData = new FormData();
        formData.append("firstName", firstName);
        formData.append("lastName", lastName);
        formData.append("gender", gender);
        formData.append("birthday", birthday);
        formData.append("tel", tel);

        startTransition(async () => {
            const res = await createMasterPlayer(formData);
            if (res.success) {
                setSuccess(true);
                setMasterPlayer(res.data as MasterPlayer);
            } else {
                setError(res.error || "เกิดข้อผิดพลาดในการลงทะเบียน");
            }
        });
    };

    return (
        <div className="animate-in fade-in duration-300">
            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 md:gap-4 items-start">

                {/* Left Column: Tournament Listing (8 cols) */}
                <div className="lg:col-span-8 space-y-2 md:space-y-4 order-2 lg:order-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4 bg-background">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tighter">All Tournaments</h1>

                        {/* Search input */}
                        <div className="relative w-full md:w-1/2">
                            <Search className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/30 group-focus-within:text-primary group-focus-within:scale-110 transition-all duration-300" />
                            <Input
                                type="search"
                                name="q"
                                placeholder="Search tournaments by name, location, or status..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Tournaments Grid */}
                    {filteredTournaments.length === 0 ? (
                        <EmptyState
                            title="ไม่พบการแข่งขัน"
                            description="ยังไม่มีข้อมูลการแข่งขันในระบบหรือค้นหาไม่พบข้อมูล"
                            icon={Trophy}
                            className="bg-card"
                        />
                    ) : (
                        <div className="flex flex-col gap-4 md:gap-6 group">
                            {filteredTournaments.map((tournament) => (
                                <Link key={tournament.id} href={`/dashboard/registration/${tournament.id}`} className="block">
                                    <Card
                                        className="flex flex-col h-full bg-card border rounded-lg transition-all hover:border-primary/50 overflow-hidden relative cursor-pointer"
                                    >
                                        <CardContent className="flex py-2 md:py-4 relative z-10 gap-2 md:gap-4">
                                            <div className="flex gap-2 md:gap-4 overflow-hidden">
                                                <Avatar className="h-14 w-14 border rounded-full group-hover:border-primary/30 transition-all shrink-0 p-1 bg-muted/30">
                                                    <AvatarImage src={tournament.logo_img ?? undefined} alt={tournament.name ?? ""} className="object-contain rounded-full" />
                                                    <AvatarFallback className="bg-primary/5 text-primary font-black rounded-full">{tournament.name ? tournament.name.substring(0, 2).toUpperCase() : ""}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col gap-1">
                                                    <CardTitle className="text-lg font-black leading-none tracking-tight group-hover:text-primary transition-colors truncate">
                                                        {tournament.name}
                                                    </CardTitle>
                                                    <CardDescription className="capitalize">
                                                        Status: {tournament.status}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 md:gap-4">
                                                <div className="flex gap-2">
                                                    <div className="h-8 w-8 bg-muted border border-border flex items-center justify-center rounded-sm text-primary">
                                                        <Calendar className="h-4 w-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-bold text-muted-foreground/60 tracking-wider">วันเริ่มแข่ง</p>
                                                        <p className="text-xs font-bold text-foreground truncate">
                                                            {tournament.start_date && tournament.end_date ? (
                                                                `${new Date(tournament.start_date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', year: '2-digit' })} - ${new Date(tournament.end_date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', year: '2-digit' })}`
                                                            ) : (
                                                                "ไม่ระบุ"
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Master Player Card (4 cols) */}
                <div className="lg:col-span-4 bg-card border rounded-xl order-1 lg:order-2">
                    {masterPlayer ? (
                        /* Player ID Card */
                        <div className="relative overflow-hidden">
                            {/* License Header */}
                            <div className="flex items-center justify-between border-b p-2 md:p-4">
                                <div className="flex items-center gap-2 md:gap-4">
                                    <span className="font-black text-foreground leading-tight">Player Verify</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 hover:bg-muted border"
                                        onClick={handleOpenEdit}
                                    >
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Badge className={`px-2.5 h-6 rounded-full text-[10px] font-black ${masterPlayer.verified
                                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                        : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                        }`}>
                                        {masterPlayer.verified ? (
                                            <>
                                                <UserCheck className="h-3 w-3 mr-1" />
                                                VERIFIED
                                            </>
                                        ) : (
                                            <>
                                                <Activity className="h-3 w-3 mr-1 animate-pulse" />
                                                PENDING
                                            </>
                                        )}
                                    </Badge>
                                </div>
                            </div>

                            {/* Main Body */}
                            <div className="flex flex-col items-center text-center space-y-2 md:space-y-4 p-2 md:p-4 relative z-10">
                                <div className="relative">
                                    <Avatar className="h-20 w-20 border-2 bg-background relative z-10 rounded-full">
                                        {masterPlayer.profile_img && <AvatarImage src={masterPlayer.profile_img} alt="Avatar" className="object-cover" />}
                                        <AvatarFallback className="font-black text-foreground text-xl">
                                            {`${masterPlayer.first_name[0]}${masterPlayer.last_name[0]}`}
                                        </AvatarFallback>
                                    </Avatar>
                                </div>

                                <div>
                                    <h3 className="text-xl font-black text-foreground leading-tight">
                                        {masterPlayer.first_name} {masterPlayer.last_name}
                                    </h3>
                                    <p className="text-xs text-primary mt-1 tracking-widest font-bold">
                                        STATUS : {masterPlayer.status}
                                    </p>
                                </div>
                            </div>

                            {/* Details list */}
                            <div className="border-t relative z-10">
                                <div className="flex items-center justify-between text-xs border-b p-2 md:p-4">
                                    <span className="flex items-center gap-2 md:gap-4">
                                        <User className="h-4 w-4 text-primary" />
                                        เพศ (Gender)
                                    </span>
                                    <span className="font-bold text-foreground">
                                        {masterPlayer.gender === 'male' ? 'ชาย (Male)' : masterPlayer.gender === 'female' ? 'หญิง (Female)' : 'อื่นๆ (Other)'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs border-b border-border p-2 md:p-4">
                                    <span className="flex items-center gap-2 md:gap-4 text-muted-foreground">
                                        <Calendar className="h-4 w-4 text-primary" />
                                        วันเกิด (Birthday)
                                    </span>
                                    <span className="font-bold text-foreground">
                                        {masterPlayer.birthday ? new Date(masterPlayer.birthday).toLocaleDateString('th-TH', { month: 'long', day: 'numeric', year: 'numeric' }) : "-"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs p-2 md:p-4">
                                    <span className="flex items-center gap-2 md:gap-4 text-muted-foreground">
                                        <Phone className="h-4 w-4 text-primary" />
                                        เบอร์ติดต่อ (Tel)
                                    </span>
                                    <span className="font-bold text-foreground">
                                        {masterPlayer.tel || "-"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Create Master Player Card / Form */
                        <div className="border relative overflow-hidden rounded-xl">
                            <div className="flex flex-row items-center gap-2 md:gap-4 p-2 md:p-4 border-b">
                                <UserPlus className="h-5 w-5 text-primary" />
                                <span className="font-black text-foreground leading-tight">CREATE YOUR MASTER PLAYER PROFILE</span>
                            </div>

                            <div className="p-2 md:p-4 space-y-2 md:space-y-4">
                                {error && (
                                    <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-xl text-xs flex items-start gap-2 mb-4 animate-shake">
                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {success && (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-3 rounded-xl text-xs flex items-start gap-2 mb-4">
                                        <UserCheck className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>ลงทะเบียนโปรไฟล์นักกีฬาสำเร็จแล้ว!</span>
                                    </div>
                                )}

                                <form onSubmit={handleCreateProfile} className="space-y-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <Label>ชื่อจริง *</Label>
                                            <Input
                                                id="firstName"
                                                type="text"
                                                required
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="ภาษาไทย/อังกฤษ"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label>นามสกุล *</Label>
                                            <Input
                                                id="lastName"
                                                type="text"
                                                required
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="ภาษาไทย/อังกฤษ"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1 flex flex-col justify-end">
                                            <Label>เพศ *</Label>
                                            <Select value={gender} onValueChange={setGender}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="เลือกเพศ" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="male">ชาย (Male)</SelectItem>
                                                    <SelectItem value="female">หญิง (Female)</SelectItem>
                                                    <SelectItem value="other">อื่นๆ (Other)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label>วัน/เดือน/ปีเกิด *</Label>
                                            <Input
                                                id="birthday"
                                                type="date"
                                                required
                                                value={birthday}
                                                onChange={(e) => setBirthday(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <Label>เบอร์โทรศัพท์ติดต่อ</Label>
                                        <Input
                                            id="tel"
                                            type="tel"
                                            value={tel}
                                            onChange={(e) => setTel(e.target.value)}
                                            placeholder="เช่น 0891234567"
                                        />
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={isPending}
                                        className="w-full"
                                    >
                                        {isPending ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                กำลังลงทะเบียน...
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="h-4 w-4" />
                                                สร้างบัตรทะเบียนนักกีฬา
                                            </>
                                        )}
                                    </Button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Profile Dialog */}
            <EditVerifyProfileDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                masterPlayer={masterPlayer}
                onSave={(updatedPlayer) => setMasterPlayer(updatedPlayer)}
            />
        </div>
    );
}
