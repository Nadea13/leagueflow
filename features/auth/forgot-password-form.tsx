"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/ui/otp-input";
import { Loader2, CheckCircle2, KeyRound, MailCheck, ArrowLeft, Eye, EyeOff, Clock, AlertCircle, RefreshCw, Check, X, Lock } from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type ForgotStep = 'email' | 'otp' | 'new_password' | 'success';
const OTP_EXPIRY_SECONDS = 180; // 3 minutes

interface PasswordStrength {
    score: number; // 1 to 4
    label: string;
    colorClass: string;
    bgClass: string;
}

function getPasswordStrength(pwd: string): PasswordStrength {
    if (!pwd) {
        return { score: 0, label: "", colorClass: "", bgClass: "" };
    }

    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
    const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

    // 4 levels:
    // Level 1: < 8 chars
    if (pwd.length < 8) {
        return {
            score: 1,
            label: "อ่อนมาก (ต้องมีอย่างน้อย 8 ตัวอักษร)",
            colorClass: "text-red-500 dark:text-red-400",
            bgClass: "bg-red-500",
        };
    }

    if (pwd.length >= 10 && varietyCount >= 3) {
        return {
            score: 4,
            label: "ปลอดภัยมาก",
            colorClass: "text-emerald-700 dark:text-emerald-400",
            bgClass: "bg-emerald-600 dark:bg-emerald-500",
        };
    }
    if (varietyCount >= 2) {
        return {
            score: 3,
            label: "ปลอดภัย",
            colorClass: "text-lime-600 dark:text-lime-400",
            bgClass: "bg-lime-500",
        };
    }
    return {
        score: 2,
        label: "พอใช้",
        colorClass: "text-amber-500 dark:text-amber-400",
        bgClass: "bg-amber-400",
    };
}

export function ForgotPasswordForm() {
    const t = useTranslations('ForgotPassword');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { toast } = useToast();

    // Multi-step: 1. Email -> 2. OTP -> 3. New Password -> 4. Success
    const [step, setStep] = useState<ForgotStep>('email');

    // Form data
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Password strength & Real-time position matching for confirmPassword
    const passwordStrength = getPasswordStrength(password);
    const confirmLength = confirmPassword.length;
    const isConfirmStarted = confirmLength > 0;
    const expectedPrefix = password.slice(0, confirmLength);
    const isConfirmMismatch = isConfirmStarted && (confirmLength > password.length || confirmPassword !== expectedPrefix);
    const isConfirmMatched = isConfirmStarted && confirmPassword === password;

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // OTP Timer state (3 minutes / 180 seconds)
    const [otpTimeLeft, setOtpTimeLeft] = useState(OTP_EXPIRY_SECONDS);
    const [otpTimestamp, setOtpTimestamp] = useState<number>(0);
    const isOtpExpired = otpTimeLeft <= 0;

    // Countdown effect for Step 2 OTP
    useEffect(() => {
        if (step !== 'otp') return;

        setOtpTimeLeft(OTP_EXPIRY_SECONDS);
        const interval = setInterval(() => {
            setOtpTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [step, otpTimestamp]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Step 1: Send OTP to email
    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await ApiClient.fetch('/auth/send-otp', {
                method: 'POST',
                body: JSON.stringify({ email }),
            });

            toast({
                title: "ส่งรหัส OTP สำเร็จ",
                description: `ระบบได้ส่งรหัส 6 หลักไปยัง ${email} (มีอายุ 3 นาที)`,
            });

            setOtp("");
            setOtpTimeLeft(OTP_EXPIRY_SECONDS);
            setOtpTimestamp(Date.now());
            setStep('otp');
        } catch (err: any) {
            setError(err.message || tCommon('something_went_wrong'));
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Verify OTP
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isOtpExpired) {
            toast({
                variant: "destructive",
                title: tCommon("error") || "เกิดข้อผิดพลาด",
                description: "รหัส OTP หมดอายุแล้ว กรุณากดขอรหัสใหม่",
            });
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            await ApiClient.fetch('/auth/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ email, otp }),
            });

            toast({
                title: "ยืนยันรหัสสำเร็จ",
                description: "กรุณาตั้งรหัสผ่านใหม่",
            });

            setStep('new_password');
        } catch (err: any) {
            setError(err.message || "รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
        } finally {
            setIsLoading(false);
        }
    };

    // Step 3: Reset password
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (password.length < 8) {
            const errorMsg = "รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร";
            setError(errorMsg);
            toast({
                variant: "destructive",
                title: "ไม่สามารถเปลี่ยนรหัสผ่านได้",
                description: errorMsg,
            });
            setIsLoading(false);
            return;
        }

        if (!confirmPassword) {
            const errorMsg = "กรุณากรอกยืนยันรหัสผ่าน";
            setError(errorMsg);
            toast({
                variant: "destructive",
                title: tCommon('error') || "เกิดข้อผิดพลาด",
                description: errorMsg,
            });
            setIsLoading(false);
            return;
        }

        if (password !== confirmPassword) {
            const errorMsg = "รหัสผ่านใหม่ไม่ตรงกัน";
            setError(errorMsg);
            toast({
                variant: "destructive",
                title: tCommon('error') || "เกิดข้อผิดพลาด",
                description: errorMsg,
            });
            setIsLoading(false);
            return;
        }

        try {
            await ApiClient.fetch('/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    new_password: password,
                }),
            });

            setStep('success');
        } catch (err: any) {
            setError(err.message || tCommon('something_went_wrong'));
        } finally {
            setIsLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="flex flex-col items-center justify-center space-y-4 py-6 text-center animate-in fade-in zoom-in duration-300">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold">เปลี่ยนรหัสผ่านสำเร็จ</h3>
                    <p className="text-sm text-muted-foreground max-w-[280px]">
                        คุณสามารถใช้รหัสผ่านใหม่เพื่อเข้าสู่ระบบได้ทันที
                    </p>
                </div>
                <Button onClick={() => router.push(`/${locale}/sign-in`)} className="mt-4 w-full">
                    {tCommon('back_to_login') || "เข้าสู่ระบบ"}
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full space-y-3">
            {error && (
                <div className="text-sm rounded-sm text-destructive text-center p-2 bg-destructive/5 border border-destructive/20">
                    {error}
                </div>
            )}

            {/* STEP 1: Enter Email */}
            {step === 'email' && (
                <form onSubmit={handleSendOtp} className="space-y-3">
                    <div className="space-y-1">
                        <Label htmlFor="email">{t('email') || "อีเมลที่ลงทะเบียนไว้"}</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder={t('email_placeholder') || "name@example.com"}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        disabled={isLoading || !email}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t('sending') || "กำลังส่งรหัส..."}
                            </>
                        ) : (
                            t('send_reset_link') || "รับรหัสรีเซ็ตรหัสผ่าน"
                        )}
                    </Button>
                </form>
            )}

            {/* STEP 2: Enter OTP */}
            {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="text-center space-y-2">
                        <div className="flex justify-center">
                            <MailCheck className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            กรอกรหัส 6 หลักที่ส่งไปยัง <b>{email}</b>
                        </p>

                        {/* OTP Expiration / Countdown */}
                        {!isOtpExpired ? (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/60 text-xs font-semibold text-muted-foreground border border-border/50">
                                <Clock className="size-4 text-primary animate-pulse" />
                                <span>รหัสจะหมดอายุใน</span>
                                <span className="font-mono text-foreground font-bold">{formatTime(otpTimeLeft)}</span>
                            </div>
                        ) : (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-xs font-semibold text-destructive border border-destructive/20 animate-in fade-in-50">
                                <AlertCircle className="size-4 text-destructive shrink-0" />
                                <span>รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่</span>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-center">
                        <OtpInput
                            value={otp}
                            onChange={setOtp}
                            length={6}
                            disabled={isLoading || isOtpExpired}
                        />
                    </div>

                    <Button
                        type="submit"
                        size="sm"
                        className="w-full"
                        disabled={isLoading || otp.length < 6 || isOtpExpired}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                <span>กำลังตรวจสอบ...</span>
                            </>
                        ) : (
                            <span>ยืนยันรหัส OTP</span>
                        )}
                    </Button>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <button
                            type="button"
                            onClick={() => {
                                setStep('email');
                                setOtp("");
                            }}
                            className="flex items-center gap-1 hover:text-foreground"
                        >
                            <ArrowLeft className="size-4" /> เปลี่ยนอีเมล
                        </button>
                        <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={isLoading}
                            className={cn(
                                "flex items-center gap-1 transition-colors",
                                isOtpExpired
                                    ? "font-bold text-primary hover:underline"
                                    : "hover:underline text-primary/80"
                            )}
                        >
                            <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
                            {isOtpExpired ? "ขอรหัส OTP ใหม่" : "ส่งรหัสอีกครั้ง"}
                        </button>
                    </div>
                </form>
            )}

            {/* STEP 3: Set New Password */}
            {step === 'new_password' && (
                <form onSubmit={handleResetPassword} noValidate className="space-y-4">
                    <div className="text-center space-y-1 pb-1">
                        <div className="flex justify-center">
                            <KeyRound className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                            ตั้งรหัสผ่านใหม่สำหรับ <b>{email}</b>
                        </p>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="password" className="text-xs font-semibold">รหัสผ่านใหม่</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50 pointer-events-none" />
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="อย่างน้อย 8 ตัวอักษร"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-9.5 pr-10 h-10"
                                required
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors p-0.5 rounded-sm"
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <EyeOff className="size-4" />
                                ) : (
                                    <Eye className="size-4" />
                                )}
                            </button>
                        </div>

                        {/* Password Strength Gauge (4 Colors: Red, Yellow, Light Green, Dark Green) */}
                        {password.length > 0 && (
                            <div className="space-y-1.5 pt-1">
                                <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
                                    {[1, 2, 3, 4].map((level) => {
                                        const isActive = passwordStrength.score >= level;
                                        let activeColor = "bg-muted";
                                        if (isActive) {
                                            if (passwordStrength.score === 1) activeColor = "bg-red-500";
                                            else if (passwordStrength.score === 2) activeColor = "bg-amber-400";
                                            else if (passwordStrength.score === 3) activeColor = "bg-lime-400";
                                            else if (passwordStrength.score === 4) activeColor = "bg-emerald-600";
                                        }
                                        return (
                                            <div
                                                key={level}
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-300",
                                                    isActive ? activeColor : "bg-muted"
                                                )}
                                            />
                                        );
                                    })}
                                </div>
                                <div className="flex justify-between items-center text-[11px]">
                                    <span className="text-muted-foreground">ความปลอดภัยของรหัส:</span>
                                    <span className={cn("font-bold tracking-tight", passwordStrength.colorClass)}>
                                        {passwordStrength.label}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="confirmPassword" className="text-xs font-semibold">
                                ยืนยันรหัสผ่านใหม่อีกครั้ง
                            </Label>
                            {isConfirmMismatch && (
                                <span className="text-[11px] text-destructive font-medium animate-in fade-in flex items-center gap-1">
                                    <X className="size-3.5" />
                                    {confirmLength > password.length ? "ความยาวเกินรหัสผ่าน" : "รหัสผ่านไม่ตรงตำแหน่งนี้"}
                                </span>
                            )}
                            {isConfirmMatched && (
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in flex items-center gap-1">
                                    <Check className="size-3.5" />
                                    รหัสผ่านตรงกัน
                                </span>
                            )}
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/50 pointer-events-none" />
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="กรอกรหัสผ่านให้ตรงกัน"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                onPaste={(e) => {
                                    e.preventDefault();
                                    toast({
                                        variant: "destructive",
                                        title: "ไม่อนุญาตให้วางข้อมูล",
                                        description: "กรุณาพิมพ์ยืนยันรหัสผ่านด้วยตนเองเพื่อความปลอดภัย",
                                    });
                                }}
                                onDrop={(e) => e.preventDefault()}
                                className={cn(
                                    "pl-9.5 pr-10 h-10 transition-colors",
                                    isConfirmMismatch && "border-destructive focus-visible:ring-destructive/20",
                                    isConfirmMatched && "border-emerald-500 focus-visible:ring-emerald-500/20"
                                )}
                                required
                                disabled={isLoading}
                            />
                            {/* Right side icon: Check if matched, X if mismatch */}
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center">
                                {isConfirmMatched && (
                                    <div className="size-5 rounded-full bg-emerald-500/10 flex items-center justify-center animate-in zoom-in-50">
                                        <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                                    </div>
                                )}
                                {isConfirmMismatch && (
                                    <div className="size-5 rounded-full bg-destructive/10 flex items-center justify-center animate-in zoom-in-50">
                                        <X className="size-3.5 text-destructive stroke-[3]" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-10 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm transition-all active:scale-[0.99]"
                        disabled={isLoading || !password || isConfirmMismatch}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="size-4 animate-spin" />
                                <span>กำลังบันทึกรหัสผ่านใหม่...</span>
                            </>
                        ) : (
                            <span>บันทึกรหัสผ่านใหม่</span>
                        )}
                    </Button>
                </form>
            )}
        </div>
    );
}
