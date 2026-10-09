"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/ui/otp-input";
import { Loader2, CheckCircle2, KeyRound, MailCheck, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { ApiClient } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

type ForgotStep = 'email' | 'otp' | 'new_password' | 'success';

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

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

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
                description: `ระบบได้ส่งรหัส 6 หลักไปยัง ${email}`,
            });

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

        if (password !== confirmPassword) {
            setError("รหัสผ่านใหม่ไม่ตรงกัน");
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError("รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร");
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
                                <Loader2 className="h-4 w-4 animate-spin" />
                                กำลังตรวจสอบ...
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

            {/* STEP 3: Set New Password */}
            {step === 'new_password' && (
                <form onSubmit={handleResetPassword} className="space-y-3">
                    <div className="text-center space-y-1 pb-1">
                        <div className="flex justify-center">
                            <KeyRound className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground">
                            ตั้งรหัสผ่านใหม่สำหรับ <b>{email}</b>
                        </p>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="password">รหัสผ่านใหม่</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="อย่างน้อย 6 ตัวอักษร"
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
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <Label htmlFor="confirmPassword">ยืนยันรหัสผ่านใหม่</Label>
                        <Input
                            id="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="กรอกรหัสผ่านตรงกัน"
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
                                <Loader2 className="h-4 w-4 animate-spin" />
                                กำลังบันทึกรหัสผ่านใหม่...
                            </>
                        ) : (
                            "บันทึกรหัสผ่านใหม่"
                        )}
                    </Button>
                </form>
            )}
        </div>
    );
}
