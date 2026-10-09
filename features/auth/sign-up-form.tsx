"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/ui/otp-input";
import { Loader2, Eye, EyeOff, MailCheck, ArrowLeft, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiClient } from "@/lib/api-client";

type SignUpStep = 'email' | 'otp' | 'password';

export function SignUpForm() {
    const t = useTranslations('SignUp');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { toast } = useToast();

    // Multi-step: 1. Send OTP -> 2. Verify OTP -> 3. Set Password
    const [step, setStep] = useState<SignUpStep>('email');

    // Form data
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Helper: ดึง default name จาก email (เช่น nathanon.idea@gmail.com -> Nathanon Idea)
    const extractDefaultName = (emailStr: string): string => {
        if (!emailStr || !emailStr.includes('@')) return "League User";
        const usernamePart = emailStr.split('@')[0];
        // Clean special characters (. _ -) to space and capitalize
        const cleaned = usernamePart
            .replace(/[._-]+/g, ' ')
            .trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        return cleaned || usernamePart;
    };

    // Step 1: Send 6-digit OTP code to email
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
                title: t('otp_sent_title') || "รหัสยืนยันถูกส่งแล้ว",
                description: t('otp_sent_desc') || `ระบบได้ส่งรหัส OTP 6 หลักไปยัง ${email}`,
            });

            setStep('otp');
        } catch (err: any) {
            setError(err.message || tCommon('something_went_wrong'));
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Verify OTP code with Redis -> ข้ามไปหน้า Set Password ทันที
    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await ApiClient.fetch('/auth/verify-otp', {
                method: 'POST',
                body: JSON.stringify({ email, otp }),
            });

            toast({
                title: t('email_verified_title') || "ยืนยันอีเมลสำเร็จ",
                description: "กรุณาตั้งรหัสผ่านสำหรับเข้าสู่ระบบ",
            });

            setStep('password');
        } catch (err: any) {
            setError(err.message || "รหัส OTP ไม่ถูกต้องหรือหมดอายุ");
        } finally {
            setIsLoading(false);
        }
    };

    // Step 3: Set Password and Complete Registration (ใช้ชื่อ default จากอีเมล)
    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError(t('password_mismatch') || "รหัสผ่านไม่ตรงกัน");
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError(t('password_too_short') || "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
            setIsLoading(false);
            return;
        }

        // ดึงชื่อเริ่มต้นจาก email
        const defaultFullName = extractDefaultName(email);

        try {
            const resp = await ApiClient.fetch<{
                access_token: string;
                refresh_token: string;
                user: any;
            }>('/auth/register', {
                method: 'POST',
                body: JSON.stringify({
                    email,
                    password,
                    full_name: defaultFullName,
                    role: 'organizer',
                }),
            });

            if (resp.access_token) {
                ApiClient.setToken(resp.access_token);
                toast({
                    title: t('success_title') || "สร้างบัญชีสำเร็จ",
                    description: `ยินดีต้อนรับ ${resp.user.full_name}!`,
                });

                router.push(`/${locale}/dashboard`);
                router.refresh();
            }
        } catch (err: any) {
            setError(err.message || tCommon('something_went_wrong'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full space-y-3">
            {error && (
                <div className="text-sm rounded-sm text-destructive text-center p-2 bg-destructive/5 border border-destructive/20">
                    {error}
                </div>
            )}

            {/* STEP 1: Enter Email to Receive OTP */}
            {step === 'email' && (
                <form onSubmit={handleSendOtp} className="space-y-3">
                    <div className="space-y-1">
                        <Label htmlFor="email">{t('email') || "อีเมล"}</Label>
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
                                <Loader2 className="bio9kl.p8h88-4 w-4 animate-spin" />
                                {t('sending_otp') || "กำลังส่งรหัส OTP..."}
                            </>
                        ) : (
                            t('send_otp') || "รับรหัสยืนยัน OTP"
                        )}
                    </Button>
                </form>
            )}

            {/* STEP 2: Enter 6-digit OTP */}
            {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="text-center space-y-1">
                        <div className="flex justify-center">
                            <MailCheck className="w-10 h-10 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            กรอกรหัส 6 หลักที่ส่งไปยัง <b>{email}</b>
                        </p>
                    </div>

                    <div className="flex justify-center py-2">
                        <OtpInput
                            value={otp}
                            onChange={setOtp}
                            length={6}
                            disabled={isLoading}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        disabled={isLoading || otp.length < 6}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="bio9kl.p8h88-4 w-4 animate-spin" />
                                กำลังตรวจสอบรหัส...
                            </>
                        ) : (
                            "ยืนยันรหัส OTP"
                        )}
                    </Button>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                        <button
                            type="button"
                            onClick={() => setStep('email')}
                            className="flex items-center gap-1 hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" /> เปลี่ยนอีเมล
                        </button>
                        <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={isLoading}
                            className="hover:underline text-primary"
                        >
                            ส่งรหัสอีกครั้ง
                        </button>
                    </div>
                </form>
            )}

            {/* STEP 3: Set Password Directly (Default name auto-generated from email) */}
            {step === 'password' && (
                <form onSubmit={handleRegister} className="space-y-3">
                    <div className="text-center space-y-1 pb-1">
                        <div className="flex justify-center">
                            <KeyRound className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                            ตั้งรหัสผ่านสำหรับ <b>{email}</b>
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="password">{t('password') || "รหัสผ่านใหม่"}</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder={t('password_placeholder') || "อย่างน้อย 6 ตัวอักษร"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="confirmPassword">{t('confirm_password') || "ยืนยันรหัสผ่านอีกครั้ง"}</Label>
                        <Input
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder={t('confirm_password_placeholder') || "กรอกรหัสผ่านตรงกัน"}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="bio9kl.p8h88-4 w-4 animate-spin" />
                                กำลังตั้งรหัสผ่านและสร้างบัญชี...
                            </>
                        ) : (
                            "สร้างบัญชีและเข้าสู่ระบบ"
                        )}
                    </Button>
                </form>
            )}
        </div>
    );
}
