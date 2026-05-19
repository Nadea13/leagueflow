"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff, User, Mail, Phone, Lock, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { sendSignUpOtp, verifySignUpOtp, completeProfile } from "@/actions/common/auth";

type Step = 'email' | 'otp' | 'profile';

export function SignUpForm() {
    const t = useTranslations('SignUp');
    const tCommon = useTranslations('Common');
    const locale = useLocale();
    const router = useRouter();
    const { toast } = useToast();

    // Step state
    const [step, setStep] = useState<Step>('email');

    // Form data
    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // UI state
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('email', email);

            const result = await sendSignUpOtp(formData, locale);

            if (!result.success) {
                setError(result.error || tCommon('something_went_wrong'));
                return;
            }

            toast({
                title: "OTP Sent",
                description: "Please check your email for the verification code.",
            });
            setStep('otp');
        } catch (_err) {
            setError(tCommon('something_went_wrong'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('otp', otp);

            const result = await verifySignUpOtp(formData, locale);

            if (!result.success) {
                setError(result.error || "Invalid OTP code");
                return;
            }

            toast({
                title: "Email Verified",
                description: "You can now complete your profile.",
            });
            setStep('profile');
        } catch (_err) {
            setError(tCommon('something_went_wrong'));
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompleteProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (password !== confirmPassword) {
            setError(t('passwords_dont_match'));
            setIsLoading(false);
            return;
        }

        try {
            const formData = new FormData();
            formData.append('fullName', fullName);
            formData.append('phone', phone);
            formData.append('password', password);
            formData.append('confirmPassword', confirmPassword);

            const result = await completeProfile(formData, locale);

            if (!result.success) {
                setError(result.error || tCommon('something_went_wrong'));
                return;
            }

            toast({
                title: t('success_title'),
                description: t('success_desc'),
            });

            // Registration complete, they are already authenticated via OTP
            router.push(`/${locale}/dashboard`);
        } catch (_err) {
            setError(tCommon('something_went_wrong'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full">
            {error && (
                <div className="mb-4 text-sm text-red-500 text-center p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-md">
                    {error}
                </div>
            )}

            {step === 'email' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-muted-foreground ml-1">{t('email')}</Label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-muted-foreground/70" />
                            </div>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isLoading}
                                className="bg-background/50 pl-10"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 ml-1">
                            We will send a verification code to this email.
                        </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending OTP...
                            </>
                        ) : (
                            "Verify Email"
                        )}
                    </Button>
                </form>
            )}

            {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="otp" className="text-muted-foreground ml-1">Verification Code (OTP)</Label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <KeyRound className="h-5 w-5 text-muted-foreground/70" />
                            </div>
                            <Input
                                id="otp"
                                type="text"
                                placeholder="123456"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                required
                                maxLength={6}
                                disabled={isLoading}
                                className="bg-background/50 pl-10 tracking-widest text-lg"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 ml-1">
                            Enter the 6-digit code sent to <strong>{email}</strong>
                        </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            "Confirm Code"
                        )}
                    </Button>
                    <div className="text-center mt-2">
                        <button 
                            type="button" 
                            onClick={() => setStep('email')}
                            className="text-sm text-primary hover:underline"
                            disabled={isLoading}
                        >
                            Change Email
                        </button>
                    </div>
                </form>
            )}

            {step === 'profile' && (
                <form onSubmit={handleCompleteProfile} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-muted-foreground ml-1">{t('full_name')}</Label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-muted-foreground/70" />
                            </div>
                            <Input
                                id="fullName"
                                type="text"
                                placeholder="John Doe"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                disabled={isLoading}
                                className="bg-background/50 pl-10"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-muted-foreground ml-1">{tCommon('phone', { fallback: 'Phone Number' })}</Label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone className="h-5 w-5 text-muted-foreground/70" />
                            </div>
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="08X-XXX-XXXX"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                required
                                disabled={isLoading}
                                className="bg-background/50 pl-10"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-muted-foreground ml-1">{t('password')}</Label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-muted-foreground/70" />
                            </div>
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="bg-background/50 pl-10 pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                disabled={isLoading}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-muted-foreground ml-1">{t('confirm_password')}</Label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-muted-foreground/70" />
                            </div>
                            <Input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                disabled={isLoading}
                                className="bg-background/50 pl-10 pr-10"
                            />
                        </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Completing Setup...
                            </>
                        ) : (
                            t('register')
                        )}
                    </Button>
                </form>
            )}
        </div>
    );
}
