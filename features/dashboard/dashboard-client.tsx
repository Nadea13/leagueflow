"use client";

import { useState, useTransition } from "react";
import { createMasterPlayer } from "@/actions/common/user";
import { Link } from "@/i18n/routing";
import {
    Trophy, User, Calendar, Phone, Shield, Search, Award, Sparkles,
    Plus, ChevronRight, AlertCircle, Loader2, UserCheck, Heart, UserPlus,
    Activity, MapPin, DollarSign
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";

interface DashboardClientProps {
    initialTournaments: any[];
    initialMasterPlayer: any;
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

    // Filter tournaments based on search query
    const filteredTournaments = initialTournaments.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
                setMasterPlayer(res.data);
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
                <div className="lg:col-span-8 space-y-2 md:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 md:gap-4 bg-background">
                        <h1 className="text-2xl md:text-3xl font-black tracking-tighter">All Tournaments</h1>

                        {/* Search input */}
                        <div className="relative w-1/2">
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
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                            {filteredTournaments.map((tournament) => (
                                <div
                                    key={tournament.id}
                                    className="group relative flex flex-col justify-between bg-card border border-border hover:border-primary/40 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                                >
                                    {/* Cover / Header color */}
                                    <div className="h-24 bg-gradient-to-r from-primary/10 to-primary/5 relative overflow-hidden flex items-end p-4 border-b border-border">
                                        {/* Sponsor / Sport Badge */}
                                        <Badge variant="outline" className="absolute top-3 right-3 text-[10px] font-black tracking-wider z-10">
                                            ACTIVE
                                        </Badge>

                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className="h-12 w-12 bg-background border border-border flex items-center justify-center rounded-lg overflow-hidden group-hover:scale-105 transition-all">
                                                {tournament.logo_img ? (
                                                    <img src={tournament.logo_img} alt={tournament.name} className="h-full w-full object-cover" />
                                                ) : (
                                                    <Trophy className="h-6 w-6 text-primary" />
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="font-black text-foreground text-base truncate leading-snug group-hover:text-primary transition-colors">
                                                    {tournament.name}
                                                </h3>
                                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    <User className="h-3 w-3" />
                                                    {tournament.organizer?.full_name || "ผู้จัดการระบบ"}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Body details */}
                                    <div className="p-4 flex-1 space-y-4">
                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed h-8">
                                            {tournament.description || "ไม่มีคำอธิบายสำหรับทัวร์นาเมนต์นี้"}
                                        </p>

                                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 bg-muted border border-border flex items-center justify-center rounded-lg text-primary">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-bold text-muted-foreground/60 tracking-wider">วันเริ่มแข่ง</p>
                                                    <p className="text-xs font-bold text-foreground truncate">{new Date(tournament.start_date).toLocaleDateString('th-TH', { month: 'short', day: 'numeric', year: '2-digit' })}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 bg-muted border border-border flex items-center justify-center rounded-lg text-primary">
                                                    <DollarSign className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[9px] font-bold text-muted-foreground/60 tracking-wider">ค่าสมัคร</p>
                                                    <p className="text-xs font-bold text-foreground truncate">
                                                        {parseFloat(tournament.registration_fee) === 0 ? "ฟรี (Free)" : `${parseFloat(tournament.registration_fee).toLocaleString()} ฿`}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action button footer */}
                                    <div className="p-4 pt-0">
                                        <Button
                                            asChild
                                            variant="outline"
                                            className="w-full flex items-center justify-center gap-2 px-4 h-10 hover:bg-accent hover:text-accent-foreground text-xs font-black rounded-xl transition-all"
                                        >
                                            <Link href={`/dashboard/tournaments/${tournament.id}`}>
                                                ดูรายละเอียดเพิ่มเติม
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Master Player Card (4 cols) */}
                <div className="lg:col-span-4 bg-background">
                    {masterPlayer ? (
                        /* Player ID Card */
                        <div className="relative overflow-hidden border rounded-xl">
                            {/* License Header */}
                            <div className="flex items-center justify-between border-b p-2 md:p-4">
                                <div className="flex items-center gap-2 md:gap-4">
                                    <Shield className="h-5 w-5 text-primary" />
                                    <span className="font-black text-foreground leading-tight">PLAYER LICENSE</span>
                                </div>
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

                            {/* Main Body */}
                            <div className="flex flex-col items-center text-center space-y-2 md:space-y-4 p-2 md:p-4 relative z-10">
                                <div className="relative">
                                    <Avatar className="h-20 w-20 border-2 border-border bg-background relative z-10 rounded-full">
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
                                        {new Date(masterPlayer.birthday).toLocaleDateString('th-TH', { month: 'long', day: 'numeric', year: 'numeric' })}
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
        </div>
    );
}

